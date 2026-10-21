import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { transform } from 'esbuild';

async function load(name) {
  const code = (await transform(fs.readFileSync(new URL('../src/services/' + name + '.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'esm' })).code;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const { loadSalesInPages, toSaleItemsRow } = await load('salesLoader');
const { createRefreshQueue } = await load('refreshQueue');
const fixtures = count => Array.from({ length: count }, (_, i) => ({ id: 's' + i, items: [], total: 100 }));
function client(rows, override) {
  const requests = [];
  return { requests, from(table) {
    const builder = {
      select() { return builder; }, order() { return builder; },
      range(start, end) {
        requests.push({ table, start, end });
        return Promise.resolve(override?.(table, start, end) ?? { data: rows.slice(start, end + 1), count: rows.length, error: null });
      }
    };
    return builder;
  }};
}
test('la lectura ligera recibe 104 ventas en una sola página', async () => {
  const rows = fixtures(104), api = client(rows);
  assert.deepEqual(await loadSalesInPages(api), rows);
  assert.deepEqual(api.requests, [{ table: 'sales_read_model_v1', start: 0, end: 199 }]);
});
test('pagina un historial ligero de más de 200 ventas', async () => {
  const rows = fixtures(450), api = client(rows);
  assert.deepEqual(await loadSalesInPages(api), rows);
  assert.equal(api.requests.length, 3);
});
test('si falta el SQL mantiene el cargador anterior de diez ventas por página', async () => {
  const rows = fixtures(104), api = client(rows, table => table === 'sales_read_model_v1' ? { data: null, count: null, error: { code: 'PGRST205', message: 'view not found' } } : undefined);
  assert.deepEqual(await loadSalesInPages(api), rows);
  assert.equal(api.requests.length, 12);
  assert.deepEqual(api.requests[1], { table: 'sales', start: 0, end: 9 });
});
test('no oculta errores de permisos detrás del modo de compatibilidad', async () => {
  const api = client([], () => ({ data: null, count: null, error: { code: '42501', message: 'denied' } }));
  await assert.rejects(loadSalesInPages(api), /42501/);
  assert.equal(api.requests.length, 1);
});
test('una vista vacía no provoca una lectura de la tabla pesada', async () => {
  const api = client([]);
  assert.deepEqual(await loadSalesInPages(api), []);
  assert.equal(api.requests.length, 1);
});
test('reduce la página ante timeout sin saltarse filas', async () => {
  const rows = fixtures(230), api = client(rows, (_table, start, end) => end - start + 1 > 100 ? { data: null, count: null, error: { code: '57014', message: 'timeout' } } : undefined);
  assert.deepEqual(await loadSalesInPages(api), rows);
  assert.deepEqual(api.requests.slice(0,2).map(r => r.start), [0,0]);
});
test('no entrega un parcial si la segunda página falla', async () => {
  const api = client(fixtures(300), (_t, start) => start > 0 ? { data: null, count: null, error: { code: '42501', message: 'denied' } } : undefined);
  await assert.rejects(loadSalesInPages(api), /42501/);
});
test('detecta conteos cambiantes, páginas duplicadas y páginas incompletas', async () => {
  const rows = fixtures(300);
  await assert.rejects(loadSalesInPages(client(rows, (_t, start) => start > 0 ? { data: rows.slice(start), count: 301, error: null } : undefined)), /cambiaron/);
  await assert.rejects(loadSalesInPages(client(rows, (_t, start) => start > 0 ? { data: rows.slice(199), count: 300, error: null } : undefined)), /identificadores/);
  await assert.rejects(loadSalesInPages(client(rows, (_t, start) => start > 0 ? { data: [], count: 300, error: null } : undefined)), /incompleta/);
});
test('las imágenes se omiten y se conservan precios cero, costos y cantidades', () => {
  const original = [{ id: 'p1', imageUrl: 'base64', image_url: 'base64', appliedPrice: 0, costPrice: 125, quantity: 2, sellingPrice: 500 }];
  assert.deepEqual(toSaleItemsRow(original), [{ id: 'p1', appliedPrice: 0, costPrice: 125, quantity: 2, sellingPrice: 500 }]);
  assert.equal(original[0].imageUrl, 'base64');
});
test('serializa recargas y agrupa cambios recibidos durante una consulta', async () => {
  let release, active = 0, maxActive = 0;
  const blocked = new Promise(resolve => { release = resolve; });
  const calls = [];
  const request = createRefreshQueue(async keys => {
    active++; maxActive = Math.max(maxActive, active); calls.push(keys);
    if (calls.length === 1) await blocked;
    active--;
  });
  const first = request(['sales']);
  const next = request(['products']);
  const last = request(['clients', 'products']);
  assert.equal(calls.length, 1);
  release();
  await Promise.all([first, next, last]);
  assert.deepEqual(calls, [['sales'], ['products', 'clients']]);
  assert.equal(maxActive, 1);
});
test('un guardado durante una lectura espera su propia recarga posterior', async () => {
  let release, observed = 0, version = 0;
  const blocked = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const request = createRefreshQueue(async () => {
    const snapshot = version;
    if (++calls === 1) await blocked;
    observed = snapshot;
  });
  const initial = request(['sales']);
  version = 1;
  const afterSave = request(['sales']);
  release();
  await Promise.all([initial, afterSave]);
  assert.equal(observed, 1);
  assert.equal(calls, 2);
});
test('un fallo no bloquea las recargas siguientes', async () => {
  let calls = 0;
  const request = createRefreshQueue(async () => { if (++calls === 1) throw new Error('simulated'); });
  await assert.rejects(request(['sales']), /simulated/);
  await request(['products']);
  await request([]);
  assert.equal(calls, 2);
});

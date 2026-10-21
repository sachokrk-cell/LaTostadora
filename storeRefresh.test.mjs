import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { create, act } from 'react-test-renderer';
const require = createRequire(import.meta.url);
const flush = () => new Promise(resolve => setImmediate(resolve));

test('el contexto conserva la pantalla, actualiza solo las tablas afectadas y agrupa realtime', async () => {
  const db = {
    products: [{ id: 'p1', name: 'Cafe', stock: 10, cost_price: 100, selling_price: 200, image_url: 'data:image/fake' }],
    clients: [], sales: [], purchases: [], consumptions: [],
    settings: [{ id: 'global_config', monthly_goal: 800000, stock_threshold: 10 }]
  };
  const calls = [];
  let onEvent, pauseProducts;
  const api = { from(table) {
    let operation = 'select', payload, filter, single = false, start = 0, end = Infinity;
    const builder = {
      select() { return builder; }, order() { return builder; },
      range(a, b) { start = a; end = b; return builder; },
      eq(key, value) { filter = [key, value]; return builder; },
      maybeSingle() { single = true; return builder; },
      insert(value) { operation = 'insert'; payload = value; return builder; },
      update(value) { operation = 'update'; payload = value; return builder; },
      then(resolve, reject) { return Promise.resolve().then(async () => {
        calls.push({ table, operation, payload });
        if (table === 'products' && operation === 'select' && pauseProducts) await pauseProducts;
        const source = table === 'sales_read_model_v1' ? 'sales' : table;
        if (operation === 'insert') db[source].push(...structuredClone(payload));
        if (operation === 'update') db[source] = db[source].map(row => row[filter[0]] === filter[1] ? { ...row, ...payload } : row);
        const rows = db[source].filter(row => !filter || row[filter[0]] === filter[1]);
        return operation === 'select' ? { data: single ? rows[0] ?? null : structuredClone(rows.slice(start, end + 1)), count: rows.length, error: null } : { data: null, error: null };
      }).then(resolve, reject); }
    };
    return builder;
  }, channel() {
    const channel = { on(_event, _filter, callback) { onEvent = callback; return channel; }, subscribe() { return channel; } };
    return channel;
  }, removeChannel() {} };
  globalThis.__storeTestApi = api;
  const bundled = await build({
    entryPoints: [new URL('../src/context/StoreContext.tsx', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
    bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'transform',
    plugins: [{ name: 'test-adapters', setup(plugin) {
      plugin.onResolve({ filter: /^react$/ }, () => ({ path: pathToFileURL(require.resolve('react')).href, external: true }));
      plugin.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'fake-client', namespace: 'fake' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ contents: 'export const supabase = globalThis.__storeTestApi;', loader: 'js' }));
    }}]
  });
  const { StoreProvider, useStore } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
  let store, root;
  function Consumer() { store = useStore(); return null; }
  await act(async () => { root = create(React.createElement(React.StrictMode, null, React.createElement(StoreProvider, null, React.createElement(Consumer)))); await flush(); });
  const reads = table => calls.filter(call => call.operation === 'select' && call.table === table).length;
  assert.equal(store.isLoading, false);
  assert.equal(store.isRefreshing, false);
  assert.equal(reads('sales_read_model_v1'), 1);
  assert.equal(reads('products'), 1);

  let release, pending;
  pauseProducts = new Promise(resolve => { release = resolve; });
  await act(async () => { pending = store.updateProduct({ ...store.products[0], name: 'Cafe actualizado' }); await flush(); });
  assert.equal(store.isLoading, false);
  assert.equal(store.isRefreshing, true);
  assert.equal(reads('sales_read_model_v1'), 1);
  release(); pauseProducts = null;
  await act(async () => { await pending; });
  assert.equal(store.products[0].name, 'Cafe actualizado');
  assert.equal(store.isRefreshing, false);

  const beforeProducts = reads('products'), beforeClients = reads('clients');
  await act(async () => {
    onEvent({ table: 'products' }); onEvent({ table: 'clients' }); onEvent({ table: 'products' });
    await new Promise(resolve => setTimeout(resolve, 350));
  });
  assert.equal(reads('products'), beforeProducts + 1);
  assert.equal(reads('clients'), beforeClients + 1);
  assert.equal(reads('sales_read_model_v1'), 1);

  await act(async () => {
    await store.addSale({ id: 's1', date: '2026-10-21T12:00:00Z', clientId: null, clientName: 'Consumidor', total: 200, amountPaid: 200, balance: 0, paymentMethod: 'Efectivo',
      items: [{ ...store.products[0], quantity: 1, appliedPrice: 200, imageUrl: 'fake', image_url: 'fake' }] });
  });
  const saved = calls.find(call => call.table === 'sales' && call.operation === 'insert').payload[0];
  assert.equal(saved.items[0].imageUrl, undefined);
  assert.equal(saved.items[0].image_url, undefined);
  assert.equal(saved.items[0].costPrice, 100);
  assert.equal(store.sales.length, 1);
  assert.equal(store.products[0].stock, 9);
  assert.equal(reads('clients'), beforeClients + 1);
  await act(async () => root.unmount());
  delete globalThis.__storeTestApi;
});

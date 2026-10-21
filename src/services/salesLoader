import type { SupabaseClient } from '@supabase/supabase-js';

// Los tickets incluyen snapshots de productos e imágenes. Serializarlos todos
// en un único SELECT provoca un statement_timeout en la base de producción.
export async function loadSalesInPages(client: Pick<SupabaseClient, 'from'>) {
  const rows: Record<string, any>[] = [];
  const ids = new Set<string>();
  let offset = 0;
  let pageSize = 10;
  let expectedCount: number | null = null;

  while (true) {
    const { data, error, count } = await client
      .from('sales')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      // Un ticket particularmente pesado puede requerir páginas más pequeñas.
      if (error.code === '57014' && pageSize > 1) {
        pageSize = Math.max(1, Math.floor(pageSize / 2));
        continue;
      }
      throw new Error(`No se pudieron leer las ventas (${error.code || 'sin código'}): ${error.message}`);
    }

    if (!Array.isArray(data)) throw new Error('Supabase devolvió un formato de ventas inesperado.');

    if (count !== null) {
      if (expectedCount !== null && count !== expectedCount) {
        throw new Error('Las ventas cambiaron durante la carga. Actualizá para obtener el historial completo.');
      }
      expectedCount = count;
    }

    for (const row of data) {
      if (!row.id || ids.has(row.id)) {
        throw new Error('El historial cambió durante la carga o contiene identificadores inválidos. Actualizá nuevamente.');
      }
      ids.add(row.id);
      rows.push(row);
    }

    offset += data.length;
    if (expectedCount !== null && offset === expectedCount) return rows;
    if (expectedCount !== null && offset > expectedCount) throw new Error('El conteo de ventas no coincide con el historial recibido.');
    if (data.length === 0) {
      if (expectedCount !== null && offset < expectedCount) throw new Error('La carga de ventas quedó incompleta. Actualizá para reintentar.');
      return rows;
    }
    if (expectedCount === null && data.length < pageSize) return rows;
  }
}

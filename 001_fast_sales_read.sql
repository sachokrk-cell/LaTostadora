-- La Tostadora: lectura liviana para dashboard e historial (PostgreSQL 15+).
-- Crea una vista de lectura y un índice; no cambia ni elimina ventas/imágenes.
-- security_invoker conserva los permisos y RLS de la tabla sales.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '20s';

create or replace view public.sales_read_model_v1
with (security_invoker = true)
as
select
  s.id, s.client_id, s.client_name, s.date, s.total,
  s.amount_paid, s.balance, s.payment_method,
  coalesce((
    select jsonb_agg(
      entry.item - 'imageUrl' - 'image_url'
      order by entry.position
    )
    from jsonb_array_elements(s.items::jsonb)
      with ordinality as entry(item, position)
  ), '[]'::jsonb) as items,
  s.created_at
from public.sales s;

-- La nueva vista solo se usa para SELECT. Las escrituras siguen en sales.
revoke all on public.sales_read_model_v1 from public, anon, authenticated;
grant select on public.sales_read_model_v1 to anon, authenticated;

create index if not exists sales_read_date_id_v1_idx
  on public.sales (date desc, id desc);

comment on view public.sales_read_model_v1 is
  'LaTostadora: tickets sin imágenes para lectura; respeta permisos/RLS de sales.';

notify pgrst, 'reload schema';
commit;

-- Comprobación: devuelve solo conteo y tamaño aproximado de la respuesta JSON.
select count(*) as ventas,
       pg_size_pretty(octet_length(coalesce(jsonb_agg(v), '[]'::jsonb)::text)::bigint) as tamano_json
from public.sales_read_model_v1 v;

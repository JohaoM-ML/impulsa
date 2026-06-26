-- Impulsa — RPC para registrar ventas de forma atómica
-- Soluciona: ventas huérfanas (venta sin items) y race condition en descuento de stock.
-- Todo ocurre en una sola transacción: insert venta + insert items + descuento de stock.

create or replace function public.registrar_venta(
  p_negocio_id uuid,
  p_total      numeric,
  p_items      jsonb,
  p_cliente_id uuid  default null,
  p_notas      text  default null
)
returns ventas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta ventas;
  v_item  jsonb;
  v_producto_id uuid;
  v_cantidad numeric;
  v_precio numeric;
begin
  -- Seguridad: el negocio debe pertenecer al usuario autenticado.
  -- (La RPC es security definer, así que validamos la pertenencia explícitamente.)
  if not exists (
    select 1 from negocios
    where id = p_negocio_id and user_id = auth.uid()
  ) then
    raise exception 'Negocio no pertenece al usuario' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un item' using errcode = '22023';
  end if;

  insert into ventas (negocio_id, total, cliente_id, notas, canal, estado)
  values (p_negocio_id, p_total, p_cliente_id, p_notas, 'presencial', 'pagado')
  returning * into v_venta;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto_id := nullif(v_item->>'producto_id', '')::uuid;
    v_cantidad    := (v_item->>'cantidad')::numeric;
    v_precio      := (v_item->>'precio_unit')::numeric;

    insert into items_venta (venta_id, producto_id, nombre_item, cantidad, precio_unit, subtotal)
    values (
      v_venta.id,
      v_producto_id,
      v_item->>'nombre_item',
      v_cantidad,
      v_precio,
      v_cantidad * v_precio
    );

    -- Descuento de stock atómico: un solo update, sin select previo (sin race condition).
    if v_producto_id is not null then
      update productos
      set stock_actual   = greatest(0, stock_actual - v_cantidad),
          actualizado_en = now()
      where id = v_producto_id
        and negocio_id = p_negocio_id;
    end if;
  end loop;

  return v_venta;
end;
$$;

grant execute on function public.registrar_venta(uuid, numeric, jsonb, uuid, text) to authenticated;

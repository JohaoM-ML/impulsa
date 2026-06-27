-- Impulsa — Compra Inteligente (Chaski)
-- Agrega periodicidad de visita de proveedores y relaciona productos con proveedor.

alter table proveedores
  add column if not exists dia_visita smallint check (dia_visita between 0 and 6),
  add column if not exists frecuencia_dias integer default 7 check (frecuencia_dias > 0);

alter table productos
  add column if not exists proveedor_id uuid references proveedores(id) on delete set null,
  add column if not exists unidad_compra text,
  add column if not exists factor_compra numeric default 1 check (factor_compra > 0);

create index if not exists idx_productos_proveedor on productos(proveedor_id);
create index if not exists idx_proveedores_negocio_dia_visita on proveedores(negocio_id, dia_visita);

-- RLS ya está habilitado para proveedores/productos en 001_schema_inicial.sql.
-- Las columnas nuevas quedan protegidas por las policies existentes:
-- proveedores_all y productos_all usando public.usuario_negocio_id().

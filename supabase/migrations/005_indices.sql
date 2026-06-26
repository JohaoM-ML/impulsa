-- Impulsa — índices faltantes en columnas de filtrado frecuente (auditoría DB-02)
-- Idempotente: IF NOT EXISTS para poder re-ejecutarse sin romper.

-- Filtrado por negocio_id en las secciones de Mi Negocio / Fiado / Flujo.
create index if not exists idx_gastos_negocio on gastos(negocio_id, creado_en desc);
create index if not exists idx_clientes_negocio on clientes(negocio_id);
create index if not exists idx_proveedores_negocio on proveedores(negocio_id);

-- items_venta se filtra por venta_id (joins y la policy EXISTS de RLS).
create index if not exists idx_items_venta_venta on items_venta(venta_id);

-- guias_proveedor se lista por negocio.
create index if not exists idx_guias_negocio on guias_proveedor(negocio_id);

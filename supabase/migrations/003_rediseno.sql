-- Impulsa — migración del rediseño de 5 secciones + IA
-- Idempotente: usa IF NOT EXISTS para poder re-ejecutarse sin romper.

-- ═══ Categoría de productos (tab Inventario de Mi Negocio) ═══
alter table productos add column if not exists categoria text;

-- ═══ Deuda a proveedores (sección "Debes" de Fiado) ═══
alter table proveedores add column if not exists deuda_total numeric default 0;

-- ═══ Desglose del PymScore (regularidad, estabilidad, manejo de deudas, antigüedad) ═══
alter table pym_scores add column if not exists componentes jsonb default '{}'::jsonb;

-- ═══ Perfil generado por el agente Claude en el onboarding ═══
alter table progreso_usuario add column if not exists perfil_ia jsonb default '{}'::jsonb;

-- Índice para filtrar inventario por categoría
create index if not exists idx_productos_negocio_categoria on productos(negocio_id, categoria);

-- Impulsa — Índice de Salud Financiera (ISF)
-- Tabla nueva; pym_scores se depreca en 010 tras validar el código.

create table if not exists salud_financiera (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid references negocios(id) on delete cascade not null,
  semana         date not null,
  indice         integer not null check (indice between 0 and 100),
  ventas_semana  numeric,
  gastos_semana  numeric,
  margen         numeric,
  explicacion    text,
  componentes    jsonb default '{}'::jsonb,
  creado_en      timestamptz default now(),
  unique(negocio_id, semana)
);

create index if not exists idx_salud_financiera_negocio on salud_financiera(negocio_id);
create index if not exists idx_salud_financiera_negocio_semana on salud_financiera(negocio_id, semana desc);

alter table salud_financiera enable row level security;

create policy "salud_financiera_all" on salud_financiera
  for all using (negocio_id = public.usuario_negocio_id());

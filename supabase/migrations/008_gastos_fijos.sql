-- Impulsa — gastos fijos mensuales (alquiler, luz, etc.)
-- Alimentan el pilar de liquidez del ISF y se usan en onboarding.

create table if not exists gastos_fijos (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid references negocios(id) on delete cascade not null,
  categoria   text not null,
  descripcion text,
  monto       numeric not null check (monto > 0),
  dia_pago    integer check (dia_pago between 1 and 28),
  activo      boolean default true,
  creado_en   timestamptz default now()
);

create index if not exists idx_gastos_fijos_negocio on gastos_fijos(negocio_id);

alter table gastos_fijos enable row level security;

create policy "gastos_fijos_all" on gastos_fijos
  for all using (negocio_id = public.usuario_negocio_id());

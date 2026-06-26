-- Impulsa — schema inicial (sin conversaciones_wsp / WhatsApp)

-- ═══ CORE ═══
create table if not exists negocios (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  nombre       text not null,
  rubro        text,
  telefono_wsp text unique,
  creado_en    timestamptz default now()
);

create table if not exists productos (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid references negocios(id) on delete cascade not null,
  nombre         text not null,
  unidad         text default 'unidades',
  stock_actual   numeric default 0,
  stock_minimo   numeric default 5,
  precio_compra  numeric,
  precio_venta   numeric,
  codigo_barras  text,
  activo         boolean default true,
  actualizado_en timestamptz default now()
);

create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid references negocios(id) on delete cascade not null,
  nombre      text not null,
  telefono    text,
  deuda_total numeric default 0,
  creado_en   timestamptz default now()
);

create table if not exists proveedores (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade not null,
  nombre     text not null,
  telefono   text
);

create table if not exists ventas (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid references negocios(id) on delete cascade not null,
  cliente_id  uuid references clientes(id),
  total       numeric not null,
  canal       text default 'presencial',
  estado      text default 'pagado',
  notas       text,
  creado_en   timestamptz default now()
);

create table if not exists items_venta (
  id          uuid primary key default gen_random_uuid(),
  venta_id    uuid references ventas(id) on delete cascade not null,
  producto_id uuid references productos(id),
  nombre_item text not null,
  cantidad    numeric not null,
  precio_unit numeric not null,
  subtotal    numeric not null
);

create table if not exists gastos (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid references negocios(id) on delete cascade not null,
  descripcion  text not null,
  monto        numeric not null,
  categoria    text,
  proveedor_id uuid references proveedores(id),
  creado_en    timestamptz default now()
);

create table if not exists guias_proveedor (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid references negocios(id) on delete cascade not null,
  proveedor_id uuid references proveedores(id),
  imagen_url   text,
  texto_raw    text,
  total        numeric,
  estado       text default 'procesada',
  creado_en    timestamptz default now()
);

create table if not exists pym_scores (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid references negocios(id) on delete cascade not null,
  semana        date not null,
  score         integer not null,
  ventas_semana numeric,
  gastos_semana numeric,
  margen        numeric,
  explicacion   text,
  creado_en     timestamptz default now()
);

-- ═══ SISTEMA DE NIVELES ═══
create table if not exists progreso_usuario (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade unique not null,
  negocio_id            uuid references negocios(id),
  nivel                 integer default 1 check (nivel between 1 and 4),
  xp_total              integer default 0,
  onboarding_completado boolean default false,
  ultimo_acceso         date default current_date,
  creado_en             timestamptz default now()
);

create table if not exists modulos_educativos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  contenido     text not null,
  nivel_minimo  integer default 1,
  nivel_maximo  integer default 4,
  xp_recompensa integer default 10,
  categoria     text,
  orden         integer,
  activo        boolean default true
);

create table if not exists progreso_modulos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  modulo_id     uuid references modulos_educativos(id) on delete cascade not null,
  completado    boolean default false,
  completado_en timestamptz,
  xp_ganado     integer default 0,
  unique(user_id, modulo_id)
);

create table if not exists preguntas_onboarding (
  id       uuid primary key default gen_random_uuid(),
  pregunta text not null,
  opciones jsonb not null,
  orden    integer,
  activo   boolean default true
);

create table if not exists respuestas_onboarding (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  pregunta_id uuid references preguntas_onboarding(id) on delete cascade not null,
  respuesta   text,
  xp_ganado   integer default 0,
  creado_en   timestamptz default now()
);

-- Índices
create index if not exists idx_negocios_user_id on negocios(user_id);
create index if not exists idx_ventas_negocio_creado on ventas(negocio_id, creado_en desc);
create index if not exists idx_productos_negocio on productos(negocio_id);
create index if not exists idx_progreso_usuario_user on progreso_usuario(user_id);

-- Helper: negocio del usuario autenticado
create or replace function public.usuario_negocio_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from negocios where user_id = auth.uid() limit 1;
$$;

-- ═══ RLS ═══
alter table negocios enable row level security;
alter table productos enable row level security;
alter table clientes enable row level security;
alter table proveedores enable row level security;
alter table ventas enable row level security;
alter table items_venta enable row level security;
alter table gastos enable row level security;
alter table guias_proveedor enable row level security;
alter table pym_scores enable row level security;
alter table progreso_usuario enable row level security;
alter table modulos_educativos enable row level security;
alter table progreso_modulos enable row level security;
alter table preguntas_onboarding enable row level security;
alter table respuestas_onboarding enable row level security;

-- negocios
create policy "negocios_select_own" on negocios for select using (user_id = auth.uid());
create policy "negocios_insert_own" on negocios for insert with check (user_id = auth.uid());
create policy "negocios_update_own" on negocios for update using (user_id = auth.uid());

-- tablas por negocio_id
create policy "productos_all" on productos for all using (negocio_id = public.usuario_negocio_id());
create policy "clientes_all" on clientes for all using (negocio_id = public.usuario_negocio_id());
create policy "proveedores_all" on proveedores for all using (negocio_id = public.usuario_negocio_id());
create policy "ventas_all" on ventas for all using (negocio_id = public.usuario_negocio_id());
create policy "gastos_all" on gastos for all using (negocio_id = public.usuario_negocio_id());
create policy "guias_all" on guias_proveedor for all using (negocio_id = public.usuario_negocio_id());
create policy "pym_scores_all" on pym_scores for all using (negocio_id = public.usuario_negocio_id());

-- items_venta via venta
create policy "items_venta_select" on items_venta for select using (
  exists (select 1 from ventas v where v.id = venta_id and v.negocio_id = public.usuario_negocio_id())
);
create policy "items_venta_insert" on items_venta for insert with check (
  exists (select 1 from ventas v where v.id = venta_id and v.negocio_id = public.usuario_negocio_id())
);
create policy "items_venta_update" on items_venta for update using (
  exists (select 1 from ventas v where v.id = venta_id and v.negocio_id = public.usuario_negocio_id())
);
create policy "items_venta_delete" on items_venta for delete using (
  exists (select 1 from ventas v where v.id = venta_id and v.negocio_id = public.usuario_negocio_id())
);

-- niveles (user_id)
create policy "progreso_usuario_own" on progreso_usuario for all using (user_id = auth.uid());
create policy "progreso_modulos_own" on progreso_modulos for all using (user_id = auth.uid());
create policy "respuestas_onboarding_own" on respuestas_onboarding for all using (user_id = auth.uid());

-- lectura pública de módulos y preguntas
create policy "modulos_select" on modulos_educativos for select using (activo = true);
create policy "preguntas_select" on preguntas_onboarding for select using (activo = true);

-- Seed: preguntas onboarding (solo si tabla vacía)
insert into preguntas_onboarding (pregunta, opciones, orden)
select v.pregunta, v.opciones, v.orden
from (values
  ('¿Cómo llevas tus ventas hoy?', '[{"id":"a","texto":"En una libreta o cuaderno","xp":10},{"id":"b","texto":"De memoria","xp":5},{"id":"c","texto":"En Excel o una app","xp":20}]'::jsonb, 1),
  ('¿Sabes cuánto ganas al mes aproximadamente?', '[{"id":"a","texto":"No tengo idea","xp":5},{"id":"b","texto":"Más o menos","xp":15},{"id":"c","texto":"Sí, lo calculo seguido","xp":25}]'::jsonb, 2),
  ('¿Controlas tu inventario?', '[{"id":"a","texto":"No, compro cuando se acaba","xp":5},{"id":"b","texto":"A veces reviso","xp":12},{"id":"c","texto":"Sí, lo tengo controlado","xp":20}]'::jsonb, 3),
  ('¿Tus clientes te deben dinero?', '[{"id":"a","texto":"Sí, varios fiados","xp":8},{"id":"b","texto":"Algunos, poco","xp":12},{"id":"c","texto":"Casi nunca","xp":15}]'::jsonb, 4),
  ('¿Qué te gustaría mejorar primero?', '[{"id":"a","texto":"Saber cuánto gano","xp":10},{"id":"b","texto":"Organizar inventario","xp":12},{"id":"c","texto":"Entender mis números","xp":18}]'::jsonb, 5)
) as v(pregunta, opciones, orden)
where not exists (select 1 from preguntas_onboarding limit 1);

-- Seed: módulos educativos (solo si tabla vacía)
insert into modulos_educativos (titulo, contenido, nivel_minimo, nivel_maximo, xp_recompensa, categoria, orden)
select v.titulo, v.contenido, v.nivel_minimo, v.nivel_maximo, v.xp_recompensa, v.categoria, v.orden
from (values
  ('Tu primera venta registrada', 'Registrar cada venta te ayuda a saber cuánto entra al final del día.', 1, 1, 10, 'ventas', 1),
  ('¿Qué es la ganancia neta?', 'La ganancia neta es lo que te queda después de restar tus gastos.', 2, 2, 15, 'finanzas', 1),
  ('Margen de utilidad', 'El margen te dice qué porcentaje de cada venta es ganancia real.', 3, 3, 20, 'finanzas', 1),
  ('Flujo de caja operativo', 'El flujo de caja muestra el dinero que entra y sale de tu negocio.', 4, 4, 25, 'finanzas', 1)
) as v(titulo, contenido, nivel_minimo, nivel_maximo, xp_recompensa, categoria, orden)
where not exists (select 1 from modulos_educativos limit 1);

alter table pym_scores add constraint pym_scores_negocio_semana_unique unique (negocio_id, semana);

-- Storage bucket para guías OCR (ejecutar en dashboard si falla aquí)
-- insert into storage.buckets (id, name, public) values ('guias', 'guias', false);

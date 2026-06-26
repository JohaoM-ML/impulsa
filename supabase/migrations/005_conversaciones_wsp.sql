-- Impulsa — Estado de las conversaciones de WhatsApp
-- Solo /api/chatbot (service role) escribe aquí; el dueño puede leer la suya
-- desde la app. El negocio se identifica por teléfono, no por sesión.

create table if not exists conversaciones_wsp (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid references negocios(id) on delete cascade not null,
  telefono       text not null,
  estado_flujo   text default 'idle',          -- idle | esperando_confirmacion
  contexto       jsonb default '{}'::jsonb,     -- acción pendiente de confirmar
  historial      jsonb default '[]'::jsonb,     -- últimos turnos {rol, texto}
  actualizado_en timestamptz default now(),
  unique(negocio_id, telefono)
);

create index if not exists idx_conversaciones_wsp_telefono on conversaciones_wsp(telefono);
create index if not exists idx_conversaciones_wsp_negocio on conversaciones_wsp(negocio_id);

alter table conversaciones_wsp enable row level security;

-- El dueño puede leer/gestionar la conversación de su propio negocio desde la app.
-- El chatbot usa el service role, que omite RLS.
create policy "conversaciones_wsp_own" on conversaciones_wsp
  for all using (negocio_id = public.usuario_negocio_id());

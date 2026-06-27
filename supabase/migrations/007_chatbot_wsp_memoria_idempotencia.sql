-- Memoria conversacional WhatsApp + idempotencia por MessageSid (Twilio reintentos)

create table if not exists conversaciones_wsp (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid references negocios(id) on delete cascade not null,
  telefono       text not null,
  estado_flujo   text default 'idle',
  contexto       jsonb default '{}'::jsonb,
  historial      jsonb default '[]'::jsonb,
  actualizado_en timestamptz default now(),
  unique(negocio_id, telefono)
);

create index if not exists idx_conversaciones_wsp_telefono on conversaciones_wsp(telefono);
create index if not exists idx_conversaciones_wsp_negocio on conversaciones_wsp(negocio_id);

alter table conversaciones_wsp enable row level security;

drop policy if exists "conversaciones_wsp_own" on conversaciones_wsp;
create policy "conversaciones_wsp_own" on conversaciones_wsp
  for all using (negocio_id = public.usuario_negocio_id());

-- Idempotencia: evita procesar dos veces el mismo MessageSid de Twilio
create table if not exists mensajes_wsp_procesados (
  id           uuid primary key default gen_random_uuid(),
  message_sid  text not null unique,
  negocio_id   uuid references negocios(id) on delete cascade not null,
  telefono     text not null,
  respuesta    jsonb,
  creado_en    timestamptz default now()
);

create index if not exists idx_mensajes_wsp_sid on mensajes_wsp_procesados(message_sid);
create index if not exists idx_mensajes_wsp_negocio on mensajes_wsp_procesados(negocio_id);

alter table mensajes_wsp_procesados enable row level security;

-- Solo el service role escribe; el dueño puede leer los de su negocio
create policy "mensajes_wsp_own" on mensajes_wsp_procesados
  for select using (negocio_id = public.usuario_negocio_id());

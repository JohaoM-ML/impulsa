-- Resumen diario por WhatsApp: hora de cierre configurable por negocio
alter table negocios
  add column if not exists hora_cierre_dia time not null default '21:00',
  add column if not exists resumen_diario_activo boolean not null default true,
  add column if not exists ultimo_resumen_enviado date;

comment on column negocios.hora_cierre_dia is 'Hora local (Perú) en que termina el día del negocio';
comment on column negocios.resumen_diario_activo is 'Si true, envía resumen diario por WhatsApp al cerrar';
comment on column negocios.ultimo_resumen_enviado is 'Fecha (Perú) del último resumen enviado — evita duplicados';

create index if not exists idx_negocios_resumen_diario
  on negocios (resumen_diario_activo, hora_cierre_dia)
  where telefono_wsp is not null and resumen_diario_activo = true;

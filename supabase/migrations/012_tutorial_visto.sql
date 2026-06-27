-- Tutorial guiado: solo usuarios nuevos (registrados después de esta migración).
-- Usuarios existentes se marcan como ya visto para no mostrarles el tour.

alter table progreso_usuario
  add column if not exists tutorial_visto boolean not null default false;

update progreso_usuario
set tutorial_visto = true
where tutorial_visto = false;

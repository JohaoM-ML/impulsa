-- Impulsa — blindaje del banco de examen (auditoría DB-01)
-- Problema: RLS es a nivel de fila, no de columna. La policy `using (activo = true)`
-- permitía que un cliente con la anon/auth key leyera `respuesta_correcta` vía PostgREST,
-- saltándose el filtrado del endpoint GET /api/examen.
--
-- Solución: privilegios a nivel de columna. anon/authenticated solo pueden SELECT
-- las columnas no sensibles. La corrección del examen (POST /api/examen) lee
-- `respuesta_correcta` con el service client (server-side), nunca expuesto al cliente.

revoke select on preguntas_examen from anon, authenticated;

grant select (id, nivel, pregunta, opciones, explicacion, activo, creado_en)
  on preguntas_examen to anon, authenticated;

-- Nota: el service_role conserva acceso completo (incluida respuesta_correcta),
-- por eso la corrección server-side usa createServiceClient().

-- 018_onboarding_5_balanceadas.sql
-- Reduce el quiz de onboarding a 5 preguntas balanceadas entre operación y
-- finanzas (2 operativas: ventas e inventario; 3 financieras: ganancia,
-- separar dinero y fijación de precio).
-- Desactiva el resto (no se borra para conservar respuestas históricas) y
-- reordena las elegidas 1..5. Idempotente.

-- 1) Desactiva todas las preguntas.
update preguntas_onboarding set activo = false;

-- 2) Activa y reordena solo las 5 balanceadas.
update preguntas_onboarding set activo = true, orden = 1
  where pregunta = '¿Cómo llevas tus ventas hoy?';
update preguntas_onboarding set activo = true, orden = 2
  where pregunta = '¿Sabes cuánto ganas al mes aproximadamente?';
update preguntas_onboarding set activo = true, orden = 3
  where pregunta = '¿Controlas tu inventario?';
update preguntas_onboarding set activo = true, orden = 4
  where pregunta = '¿Separas el dinero del negocio del dinero de tu casa?';
update preguntas_onboarding set activo = true, orden = 5
  where pregunta = '¿Cómo decides el precio de lo que vendes?';

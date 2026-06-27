-- 017_preguntas_finanzas_onboarding.sql
-- Agrega preguntas de finanzas al quiz de onboarding.
-- Las 5 preguntas iniciales (001) tocan ventas/inventario/fiados; aquí sumamos
-- hábitos financieros (separar plata, reponer, costos fijos, precio, ahorro).
-- Lenguaje de nivel 1 (bodeguero). Más XP = mayor madurez financiera, lo que
-- ayuda al agente de categorización a ubicar el nivel del dueño.
-- Idempotente: cada pregunta solo se inserta si su texto aún no existe.

insert into preguntas_onboarding (pregunta, opciones, orden, activo)
select v.pregunta, v.opciones, v.orden, true
from (values
  (
    '¿Separas el dinero del negocio del dinero de tu casa?',
    '[{"id":"a","texto":"No, es la misma plata","xp":5},{"id":"b","texto":"A veces lo separo","xp":12},{"id":"c","texto":"Sí, siempre lo tengo aparte","xp":22}]'::jsonb,
    6
  ),
  (
    '¿Apartas dinero para volver a comprar mercadería?',
    '[{"id":"a","texto":"No, compro con lo que haya en la caja","xp":5},{"id":"b","texto":"Trato de guardar algo","xp":12},{"id":"c","texto":"Sí, siempre dejo un monto para reponer","xp":22}]'::jsonb,
    7
  ),
  (
    '¿Sabes cuánto pagas cada mes en local, luz, agua y otros gastos fijos?',
    '[{"id":"a","texto":"No los tengo claros","xp":5},{"id":"b","texto":"Más o menos","xp":14},{"id":"c","texto":"Sí, los tengo anotados","xp":24}]'::jsonb,
    8
  ),
  (
    '¿Cómo decides el precio de lo que vendes?',
    '[{"id":"a","texto":"Le pongo lo que cobran los demás","xp":8},{"id":"b","texto":"Le sumo algo a lo que me costó","xp":15},{"id":"c","texto":"Calculo mi ganancia sobre el costo","xp":24}]'::jsonb,
    9
  ),
  (
    '¿Tienes un dinero guardado por si vienen meses bajos?',
    '[{"id":"a","texto":"No, vivo del día a día","xp":5},{"id":"b","texto":"Un poquito, no mucho","xp":13},{"id":"c","texto":"Sí, tengo un fondo aparte","xp":24}]'::jsonb,
    10
  )
) as v(pregunta, opciones, orden)
where not exists (
  select 1 from preguntas_onboarding p where p.pregunta = v.pregunta
);

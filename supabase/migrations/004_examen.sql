-- Impulsa — Examen de nivel
-- Banco de preguntas por nivel + registro de intentos.

create table if not exists preguntas_examen (
  id                 uuid primary key default gen_random_uuid(),
  nivel              integer not null check (nivel between 1 and 4),
  pregunta           text not null,
  opciones           jsonb not null,        -- [{"id":"a","texto":"..."}]
  respuesta_correcta text not null,         -- id de la opción correcta
  explicacion        text,
  activo             boolean default true,
  creado_en          timestamptz default now()
);

create table if not exists intentos_examen (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete cascade not null,
  nivel     integer not null check (nivel between 1 and 4),
  correctas integer not null,
  total     integer not null,
  aprobado  boolean not null,
  creado_en timestamptz default now()
);

create index if not exists idx_preguntas_examen_nivel on preguntas_examen(nivel, activo);
create index if not exists idx_intentos_examen_user on intentos_examen(user_id, creado_en desc);

-- ═══ RLS ═══
alter table preguntas_examen enable row level security;
alter table intentos_examen enable row level security;

-- El banco se lee públicamente (la respuesta correcta nunca se expone vía API).
create policy "preguntas_examen_select" on preguntas_examen for select using (activo = true);

-- Cada usuario solo ve y crea sus propios intentos.
create policy "intentos_examen_own" on intentos_examen for all using (user_id = auth.uid());

-- ═══ Seed: banco de preguntas (solo si la tabla está vacía) ═══
insert into preguntas_examen (nivel, pregunta, opciones, respuesta_correcta, explicacion)
select v.nivel, v.pregunta, v.opciones, v.correcta, v.explicacion
from (values
  -- ── Nivel 1: Bodeguero → Emprendedor ──
  (1, '¿Por qué conviene anotar cada venta del día?',
   '[{"id":"a","texto":"Para saber cuánto dinero entró realmente"},{"id":"b","texto":"Solo para impresionar a los clientes"},{"id":"c","texto":"No sirve de nada, mejor de memoria"}]'::jsonb,
   'a', 'Anotar cada venta te da el dato real de cuánto entró, sin depender de la memoria.'),
  (1, 'Si vendes un producto, ¿qué dato es más importante registrar?',
   '[{"id":"a","texto":"El color del empaque"},{"id":"b","texto":"Cuánto cobraste y qué vendiste"},{"id":"c","texto":"La hora exacta al segundo"}]'::jsonb,
   'b', 'Lo clave es qué vendiste y a cuánto, para conocer tus ingresos.'),
  (1, '¿Qué es el "stock" de un producto?',
   '[{"id":"a","texto":"La cantidad que te queda para vender"},{"id":"b","texto":"El precio de venta"},{"id":"c","texto":"La marca del producto"}]'::jsonb,
   'a', 'El stock es cuántas unidades tienes disponibles para vender.'),
  (1, 'Un cliente te paga después ("al fiado"). ¿Qué deberías hacer?',
   '[{"id":"a","texto":"Olvidarlo, ya pagará"},{"id":"b","texto":"Anotar cuánto te debe y quién es"},{"id":"c","texto":"No volver a venderle nunca"}]'::jsonb,
   'b', 'Registrar el fiado evita que pierdas ese dinero por olvido.'),
  (1, '¿Cada cuánto conviene revisar lo que vendiste?',
   '[{"id":"a","texto":"Una vez al año"},{"id":"b","texto":"Todos los días o muy seguido"},{"id":"c","texto":"Nunca, no hace falta"}]'::jsonb,
   'b', 'Revisar a diario te mantiene al tanto de tu negocio.'),
  (1, 'Si no sabes cuánto vendes, ¿qué problema tendrás?',
   '[{"id":"a","texto":"Ninguno"},{"id":"b","texto":"No sabrás si ganas o pierdes"},{"id":"c","texto":"Venderás más automáticamente"}]'::jsonb,
   'b', 'Sin registrar ventas es imposible saber si el negocio gana o pierde.'),

  -- ── Nivel 2: Emprendedor → Comerciante ──
  (2, '¿Qué es la ganancia neta?',
   '[{"id":"a","texto":"Todo el dinero que entró por ventas"},{"id":"b","texto":"Lo que queda después de restar los gastos"},{"id":"c","texto":"El precio de compra del producto"}]'::jsonb,
   'b', 'La ganancia neta es lo que te queda luego de restar todos tus gastos a las ventas.'),
  (2, 'Compras un producto a S/ 2 y lo vendes a S/ 3. ¿Cuánto ganas por unidad?',
   '[{"id":"a","texto":"S/ 1"},{"id":"b","texto":"S/ 3"},{"id":"c","texto":"S/ 5"}]'::jsonb,
   'a', 'Ganancia = precio de venta (3) − precio de compra (2) = S/ 1.'),
  (2, '¿Para qué sirve controlar el inventario?',
   '[{"id":"a","texto":"Para saber qué reponer y no quedarte sin stock"},{"id":"b","texto":"Para nada en particular"},{"id":"c","texto":"Solo para negocios grandes"}]'::jsonb,
   'a', 'Controlar inventario evita quedarte sin productos o comprar de más.'),
  (2, '¿Cuál es un gasto fijo típico de una bodega?',
   '[{"id":"a","texto":"El alquiler del local"},{"id":"b","texto":"Una venta de gaseosa"},{"id":"c","texto":"Una propina"}]'::jsonb,
   'a', 'El alquiler es un gasto fijo: se paga sí o sí cada mes.'),
  (2, 'Si vendes mucho pero no te queda dinero, ¿qué puede estar pasando?',
   '[{"id":"a","texto":"Tus gastos son demasiado altos"},{"id":"b","texto":"Estás ganando demasiado"},{"id":"c","texto":"Es imposible que pase"}]'::jsonb,
   'a', 'Vender mucho sin ganar suele significar que los gastos se comen la ganancia.'),
  (2, '¿Qué conviene hacer con los productos que más se venden?',
   '[{"id":"a","texto":"Dejar de comprarlos"},{"id":"b","texto":"Tener siempre stock suficiente"},{"id":"c","texto":"Subirles mucho el precio de golpe"}]'::jsonb,
   'b', 'Los productos estrella deben estar siempre disponibles para no perder ventas.'),

  -- ── Nivel 3: Comerciante → Empresario ──
  (3, '¿Qué indica el margen de utilidad?',
   '[{"id":"a","texto":"El porcentaje de cada venta que es ganancia"},{"id":"b","texto":"El total de productos en stock"},{"id":"c","texto":"La cantidad de clientes"}]'::jsonb,
   'a', 'El margen muestra qué porcentaje de cada sol vendido es ganancia real.'),
  (3, 'Vendes a S/ 10 algo que te costó S/ 6. ¿Cuál es tu margen aproximado?',
   '[{"id":"a","texto":"40%"},{"id":"b","texto":"60%"},{"id":"c","texto":"10%"}]'::jsonb,
   'a', 'Margen = (10 − 6) / 10 = 0,4 = 40%.'),
  (3, '¿Por qué es riesgoso tener muchos clientes con fiado sin control?',
   '[{"id":"a","texto":"Te quedas sin efectivo para reponer mercadería"},{"id":"b","texto":"No tiene ningún riesgo"},{"id":"c","texto":"Mejora siempre tu caja"}]'::jsonb,
   'a', 'Demasiado fiado sin cobrar te deja sin liquidez para seguir operando.'),
  (3, '¿Qué es el flujo de caja?',
   '[{"id":"a","texto":"El dinero que entra y sale de tu negocio"},{"id":"b","texto":"El número de productos vendidos"},{"id":"c","texto":"El nombre de un proveedor"}]'::jsonb,
   'a', 'El flujo de caja es el movimiento real de dinero que entra y sale.'),
  (3, 'Para fijar bien un precio, deberías considerar:',
   '[{"id":"a","texto":"Solo lo que cobra el vecino"},{"id":"b","texto":"Tu costo más un margen de ganancia"},{"id":"c","texto":"Un número al azar"}]'::jsonb,
   'b', 'El precio debe cubrir tu costo y dejar un margen de ganancia razonable.'),
  (3, '¿Qué te ayuda a decidir qué productos darte de baja?',
   '[{"id":"a","texto":"Ver cuáles casi no se venden y dan poco margen"},{"id":"b","texto":"Elegir al azar"},{"id":"c","texto":"Quitar los que más se venden"}]'::jsonb,
   'a', 'Conviene dar de baja lo que rota poco y deja poca ganancia.'),

  -- ── Nivel 4: Empresario (dominio) ──
  (4, '¿Qué es proyectar tus ventas?',
   '[{"id":"a","texto":"Estimar cuánto venderás a futuro según tu historial"},{"id":"b","texto":"Vender solo los fines de semana"},{"id":"c","texto":"Regalar productos"}]'::jsonb,
   'a', 'Proyectar es estimar tus ventas futuras usando tus datos históricos.'),
  (4, 'Un banco evalúa darte un crédito. ¿Qué le interesa ver?',
   '[{"id":"a","texto":"Tu historial ordenado de ingresos y gastos"},{"id":"b","texto":"El color de tu local"},{"id":"c","texto":"Cuántos amigos tienes"}]'::jsonb,
   'a', 'Un historial financiero ordenado demuestra que puedes pagar el crédito.'),
  (4, '¿Para qué reinvertir parte de tus ganancias?',
   '[{"id":"a","texto":"Para hacer crecer el negocio"},{"id":"b","texto":"No conviene nunca"},{"id":"c","texto":"Solo para gastar en lujos"}]'::jsonb,
   'a', 'Reinvertir ganancias permite ampliar y hacer crecer el negocio.'),
  (4, '¿Qué es un indicador clave (KPI) para tu negocio?',
   '[{"id":"a","texto":"Un número que mide cómo va tu negocio, como el margen"},{"id":"b","texto":"Un tipo de producto"},{"id":"c","texto":"Un cliente frecuente"}]'::jsonb,
   'a', 'Un KPI es una métrica clave (margen, ventas, rotación) que mide tu desempeño.'),
  (4, 'Si quieres pedir un crédito para crecer, lo ideal es:',
   '[{"id":"a","texto":"Tener tus números ordenados y un plan de uso"},{"id":"b","texto":"Pedir sin saber para qué"},{"id":"c","texto":"Evitar siempre todo crédito"}]'::jsonb,
   'a', 'Con números claros y un plan, el crédito se vuelve una herramienta de crecimiento.'),
  (4, '¿Qué diferencia a un empresario de un bodeguero que recién empieza?',
   '[{"id":"a","texto":"Planifica, mide y toma decisiones con datos"},{"id":"b","texto":"Vende exactamente lo mismo"},{"id":"c","texto":"Trabaja menos horas siempre"}]'::jsonb,
   'a', 'El empresario usa datos para planificar y decidir, no solo la intuición.')
) as v(nivel, pregunta, opciones, correcta, explicacion)
where not exists (select 1 from preguntas_examen limit 1);

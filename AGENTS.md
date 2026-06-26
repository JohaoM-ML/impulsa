# AGENTS.md — Impulsa
# Instrucciones para agentes de IA trabajando en este proyecto

## Contexto rápido
Impulsa es una PWA para bodegueros peruanos. 3 días de desarrollo. 1 developer.
Stack: Next.js 14 + Supabase + Claude API + Google Vision + Meta WhatsApp API + n8n.
Lee `.cursorrules` para el contexto completo.

---

## Principio de arquitectura más importante
**n8n orquesta, Next.js piensa.** Toda la lógica del asesor vive en `/api/chatbot` y `lib/chatbot/` (valida secreto, resuelve negocio por teléfono, detecta intención con Claude, confirma con botones y escribe en Supabase; estado en `conversaciones_wsp`).
n8n solo recibe el mensaje de WhatsApp, lo manda a tu API, y devuelve la respuesta.
Si alguien sugiere poner consultas a Supabase o llamadas a Claude dentro de n8n,
es un error de arquitectura — redirígelo a `/api/chatbot`.

## Navegación y estructura (rediseño de 5 secciones)
La app tiene 5 secciones en el nav inferior (`components/NavInferior.tsx`):

| Sección    | Ruta          | Contenido |
|------------|---------------|-----------|
| Inicio     | `/inicio`     | Saludo, resumen de hoy, PymScore circular, accesos rápidos, avisos |
| Registrar  | `/registrar`  | Tabs Foto / Voz / Manual + toggle Venta/Compra |
| Mi Negocio | `/mi-negocio` | Tabs Flujo / Inventario / Top / Fiado |
| PymScore   | `/pym-score`  | Score circular, 4 componentes, evolución, expediente, entidades |
| Aprender   | `/aprender`   | Nivel actual, módulos por nivel, examen |

- Todas las páginas del dashboard se montan dentro de `components/layout/DashboardShell.tsx`, que ya renderiza `TopBar` (logo + badge de nivel) y `NavInferior`. No vuelvas a poner una barra superior por página.
- Las rutas antiguas `/ventas`, `/inventario`, `/gastos`, `/clientes` redirigen a Registrar/Mi Negocio; el código legacy vive en `app/(dashboard)/_legacy/`.

## IA en el producto (Claude + OpenAI)
- **Claude** (`lib/claude.ts`, `@anthropic-ai/sdk`, modelo `claude-sonnet-4-6`):
  - `extraerItemsDeImagen()` — lee fotos (boletas/guías) y devuelve productos.
  - `estructurarMovimiento()` — convierte texto libre en items, calzando inventario.
  - `generarExplicacionPymScore()` — explicación del score.
- **Agente de categorización** (`lib/agente/categorizacion.ts`): clasifica el nivel del dueño en el onboarding. Siempre con fallback a reglas de XP si no hay API key o falla el parseo.
- **OpenAI** (`lib/openai.ts`): solo transcripción de voz (Claude no acepta audio). Whisper.
- Rutas de IA en `app/api/ia/*` (`extraer-foto`, `transcribir`, `estructurar`): usan sesión Supabase (`getNegocioFromSession`), NO el secreto de n8n. Toda la IA del producto va por estas rutas, nunca desde el cliente directo a los proveedores.
- Env: `ANTHROPIC_API_KEY` y `OPENAI_API_KEY` solo server-side.

---

## Agente principal — qué hacer en cada tarea

### Cuando te pidan crear una página nueva
1. Verifica el layout del grupo de rutas correcto
2. Importa `useNivel` — todas las páginas del dashboard usan vocabulario adaptativo
3. Crea loading, error y empty state
4. Diseña mobile-first (Galaxy A14, 390px)
5. Usa shadcn/ui para forms y botones

### Cuando te pidan crear una API route normal
1. Va en `app/api/[recurso]/route.ts`
2. Estructura: verificar sesión Supabase → obtener negocio_id de la sesión → validar → lógica → try/catch
3. NUNCA aceptar negocio_id del body

### Cuando trabajes en /api/chatbot (caso especial)
1. Esta route NO usa sesión Supabase — valida `N8N_WEBHOOK_SECRET` del header
2. Identifica el negocio por el campo `telefono_wsp` usando el teléfono del request
3. Lee el estado actual de la conversación en `conversaciones_wsp`
4. Detecta la intención del mensaje (consultar, registrar venta, ver deuda, etc)
5. Para acciones que modifican datos: devolver botones de confirmación, no ejecutar directo
6. Escribe el nuevo estado en `conversaciones_wsp` antes de responder
7. Devuelve SIEMPRE el contrato: `{ respuesta: string, botones?: [...] }`

### Cuando te pidan ayuda con el flujo de n8n
El flujo activo usa **Twilio** (no Meta Cloud API):

1. **Webhook** — Twilio POST a `/webhook/impulsa-twilio-whatsapp`
2. **Code** — normaliza `From`/`Body` al contrato de `/api/chatbot`
3. **HTTP Request** — POST a `${APP_URL}/api/chatbot` con header `x-n8n-secret`
4. **Code** — convierte `{ respuesta, botones? }` a TwiML
5. **Respond to Webhook** — devuelve XML a Twilio (sin nodo Twilio ni credenciales en n8n)

Ver `n8n/README.md` y `n8n/impulsa-twilio-whatsapp-twiml.json`. El flujo Meta legacy está en `n8n/_legacy/`.

### Cuando te pidan tocar la base de datos
1. Filtrar SIEMPRE por `negocio_id` (o `user_id` en tablas de niveles)
2. `createServerClient` en routes, `createBrowserClient` en componentes
3. Tabla nueva → agregar policy de RLS

### Cuando te pidan algo del sistema de niveles
1. Lee `.cursor/agents/experto-niveles.md` antes de escribir código
2. Vocabulario solo vía `vocab()` de `lib/vocabulario.ts`

---

## Reglas que nunca romper
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side
- Nunca devolver datos de un negocio a otro usuario
- Nunca hardcodear términos financieros — usar `vocab(key, nivel)`
- Nunca poner lógica de negocio en n8n
- Nunca dejar `console.log` de credenciales

---

## Decisiones de arquitectura ya tomadas (no cuestionar)
- WhatsApp vía **Twilio** + n8n webhook (respuesta TwiML; sin credenciales Twilio en n8n)
- n8n SÍ se usa, pero solo como orquestador de mensajería (no lógica)
- No Prisma — solo @supabase/supabase-js
- No tests unitarios — hackathon de 3 días
- Instagram = roadmap v2

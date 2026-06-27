# n8n — WhatsApp vía Twilio

n8n **solo orquesta mensajería**. Toda la lógica del asesor vive en `/api/chatbot` y `lib/chatbot/`.

## Workflow activo (producción)

| Campo | Valor |
|-------|-------|
| Nombre | Impulsa - Twilio WhatsApp -> Chatbot |
| ID | `OPtPg15r4ASjgWKh` |
| Estado | Activo y verificado end-to-end |
| Instancia | [impulsa12121.app.n8n.cloud](https://impulsa12121.app.n8n.cloud/workflow/OPtPg15r4ASjgWKh) |
| Webhook (POST) | `https://impulsa12121.app.n8n.cloud/webhook/impulsa-twilio-whatsapp` |
| App Vercel | `https://impulsa-kappa.vercel.app` |
| Negocio de prueba | `Bodeguita` (`telefono_wsp = 51924128677`) |

Fuente versionada en git: [`impulsa-twilio-whatsapp-twiml.json`](./impulsa-twilio-whatsapp-twiml.json).
El workflow desplegado tiene la URL de Vercel y el header `x-n8n-secret` configurados directamente en el nodo HTTP. No versionar el valor completo del secreto.

## Flujo

```
WhatsApp del usuario ──► Twilio Sandbox ──POST──► n8n Webhook
                                  │
                                  ▼
                          Normalizar (From, Body)
                                  │
                                  ▼
                     POST https://impulsa-kappa.vercel.app/api/chatbot
                     Header: x-n8n-secret
                                  │
                                  ▼
                          Armar TwiML <Message>
                                  │
                                  ▼
                     Responder XML ──► Twilio envía el WhatsApp
```

No requiere credenciales de Twilio dentro de n8n: la respuesta va en TwiML y Twilio la entrega al usuario.

## Configuración real en n8n

En n8n Cloud el workflow quedó configurado sin depender de `$env`:

| Nodo | Parámetro | Valor |
|------|-----------|-------|
| `Twilio WhatsApp Inbound` | Method | `POST` |
| `Twilio WhatsApp Inbound` | Path | `impulsa-twilio-whatsapp` |
| `Llamar a /api/chatbot` | URL | `https://impulsa-kappa.vercel.app/api/chatbot` |
| `Llamar a /api/chatbot` | Body | `telefono`, `mensaje`, `tipo`, `messageSid`, `mediaUrl?`, `mediaContentType?` |
| `Responder a Twilio` | Content-Type | `text/xml` |

El header `x-n8n-secret` debe coincidir con `N8N_WEBHOOK_SECRET` en Vercel. Si `/api/chatbot` responde 401, el secreto no coincide.

## Estado verificado

| Check | Resultado |
|-------|-----------|
| Usuario unido al sandbox | OK: `+51 924 128 677` |
| Webhook Twilio → n8n | OK |
| n8n → Vercel `/api/chatbot` | OK |
| Supabase `telefono_wsp` | OK: `51924128677` en negocio `Bodeguita` |
| Ejecución real n8n | OK: modo `webhook`, status `success` |
| Memoria `conversaciones_wsp` | Tabla creada en Supabase |
| Idempotencia `messageSid` | Tabla `mensajes_wsp_procesados` |
| Audio WhatsApp | Requiere `TWILIO_API_KEY_*` + `OPENAI_API_KEY` en Vercel |

## Configuración en Twilio

1. Twilio Console → **Messaging** → **WhatsApp Sandbox** (o sender aprobado).
2. Campo **"When a message comes in"** → pegar la Production URL del webhook:
   `https://impulsa12121.app.n8n.cloud/webhook/impulsa-twilio-whatsapp`
3. Método: **POST**.
4. Guardar con **Save**.

Twilio envía `From=whatsapp:+51...` y `Body=texto`. El nodo Code los traduce al contrato de la API.

Para probar con sandbox, cada teléfono debe unirse primero enviando el código `join ...` que muestra Twilio. El número de prueba actual es `+51 924 128 677`.

## Contrato `/api/chatbot`

```json
// n8n → Next.js
{ "telefono": "whatsapp:+51987654321", "mensaje": "vendí 3 arroz", "tipo": "text" }

// Next.js → n8n
{ "respuesta": "¿Confirmas la venta?", "botones": [{ "id": "si", "titulo": "Sí" }] }
```

Con Twilio, los botones se muestran como opciones de texto al final del mensaje (no botones nativos de WhatsApp).

## Variables en Next.js (`.env.local`)

```env
N8N_WEBHOOK_SECRET=          # mismo valor configurado en el nodo HTTP de n8n
NEXT_PUBLIC_APP_URL=https://impulsa-kappa.vercel.app
```

Opcional para otras integraciones Twilio (no usadas por el workflow n8n actual):

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## Legacy — Meta Cloud API

El flujo original con WhatsApp Trigger nativo de n8n está en [`_legacy/flujo-meta-cloud-api.json`](./_legacy/flujo-meta-cloud-api.json). No es el canal activo del proyecto; se conserva como referencia.

## Probar sin Twilio

En n8n, ejecutar el workflow en modo test con pin data en el webhook (`From`, `Body`) y simular la respuesta del nodo HTTP. La ejecución de prueba del workflow activo completó con éxito.

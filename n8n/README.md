# n8n — WhatsApp vía Twilio

n8n **solo orquesta mensajería**. Toda la lógica del asesor vive en `/api/chatbot` y `lib/chatbot/`.

## Workflow activo (producción)

| Campo | Valor |
|-------|-------|
| Nombre | Impulsa - Twilio WhatsApp -> Chatbot |
| ID | `OPtPg15r4ASjgWKh` |
| Estado | Activo |
| Instancia | [impulsa12121.app.n8n.cloud](https://impulsa12121.app.n8n.cloud/workflow/OPtPg15r4ASjgWKh) |
| Webhook (POST) | `https://impulsa12121.app.n8n.cloud/webhook/impulsa-twilio-whatsapp` |

Fuente versionada en git: [`impulsa-twilio-whatsapp-twiml.json`](./impulsa-twilio-whatsapp-twiml.json)

## Flujo

```
Twilio (WhatsApp) ──POST──► n8n Webhook
                                  │
                                  ▼
                          Normalizar (From, Body)
                                  │
                                  ▼
                     POST {APP_URL}/api/chatbot  (x-n8n-secret)
                                  │
                                  ▼
                          Armar TwiML <Message>
                                  │
                                  ▼
                     Responder XML ──► Twilio envía el WhatsApp
```

No requiere credenciales de Twilio dentro de n8n: la respuesta va en TwiML y Twilio la entrega al usuario.

## Variables en n8n (Settings → Variables o env del contenedor)

| Variable n8n | Debe coincidir con | Uso |
|--------------|-------------------|-----|
| `APP_URL` | `NEXT_PUBLIC_APP_URL` de la app | Base URL de Next.js (sin `/` final) |
| `N8N_WEBHOOK_SECRET` | `N8N_WEBHOOK_SECRET` de `.env.local` | Header `x-n8n-secret` hacia `/api/chatbot` |

Si `/api/chatbot` responde 401, el secreto no coincide entre n8n y la app.

## Configuración en Twilio

1. Twilio Console → **Messaging** → **WhatsApp Sandbox** (o sender aprobado).
2. Campo **"When a message comes in"** → pegar la Production URL del webhook:
   `https://impulsa12121.app.n8n.cloud/webhook/impulsa-twilio-whatsapp`
3. Método: **POST**.

Twilio envía `From=whatsapp:+51...` y `Body=texto`. El nodo Code los traduce al contrato de la API.

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
N8N_WEBHOOK_SECRET=          # mismo valor que en n8n
NEXT_PUBLIC_APP_URL=           # URL pública de la app (Vercel o túnel en local)
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

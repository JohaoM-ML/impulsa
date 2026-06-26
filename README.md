# Impulsa

PWA mobile-first para micro y pequeñas empresas peruanas informales. Ayuda al dueño de una bodega a **operar** (registrar ventas, inventario y gastos), **entender** su negocio (dashboard y PymScore en su propio lenguaje) y **creer** (educación financiera adaptada a su nivel).

**Hackathon:** IDEATECH PYME 2026 · Stack: Next.js 14 + Supabase + Claude + OpenAI Whisper + Google Vision + n8n (WhatsApp).

---

## Tabla de contenidos

1. [Características](#características)
2. [Stack tecnológico](#stack-tecnológico)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Requisitos previos](#requisitos-previos)
5. [Configuración local](#configuración-local)
6. [Variables de entorno](#variables-de-entorno)
7. [Base de datos](#base-de-datos)
8. [Navegación y rutas](#navegación-y-rutas)
9. [API Routes](#api-routes)
10. [Sistema de niveles](#sistema-de-niveles)
11. [Inteligencia artificial](#inteligencia-artificial)
12. [WhatsApp y n8n](#whatsapp-y-n8n)
13. [Flujo de demo](#flujo-de-demo)
14. [Despliegue en Vercel](#despliegue-en-vercel)
15. [Convenciones de código](#convenciones-de-código)
16. [Documentación adicional](#documentación-adicional)

---

## Características

| Módulo | Descripción |
|--------|-------------|
| **Inicio** | Resumen del día, PymScore circular, accesos rápidos y avisos |
| **Registrar** | Tabs Foto / Voz / Manual con toggle Venta o Compra |
| **Mi Negocio** | Tabs Flujo de caja, Inventario, Top productos y Fiado (clientes/proveedores) |
| **PymScore** | Score de salud financiera (nivel 2+), componentes y evolución |
| **Aprender** | Módulos educativos por nivel y examen para subir de nivel |
| **Onboarding** | Quiz inicial + agente Claude que asigna nivel y XP |

El vocabulario, la complejidad de los gráficos y las funciones visibles **cambian según el nivel** del emprendedor (1–4).

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 14 (App Router), TypeScript estricto |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Estilos | Tailwind CSS + shadcn/ui |
| IA texto/imagen | Anthropic Claude (`claude-sonnet-4-6`) |
| IA voz | OpenAI Whisper |
| OCR | Google Cloud Vision |
| WhatsApp | Twilio + n8n (webhook + TwiML; solo orquestación) |
| Deploy | Vercel |

> **Principio de arquitectura:** n8n orquesta mensajería; toda la lógica del asesor vive en `/api/chatbot` y `lib/chatbot/` (intención con Claude, confirmación con botones y escritura en Supabase).

---

## Estructura del proyecto

```
impulsa/
├── app/
│   ├── (auth)/login, registro     # Autenticación Supabase
│   ├── (dashboard)/               # App principal (5 secciones)
│   │   ├── _legacy/               # Rutas antiguas (referencia, no públicas)
│   │   ├── inicio/
│   │   ├── registrar/
│   │   ├── mi-negocio/
│   │   ├── pym-score/
│   │   └── aprender/
│   ├── onboarding/                # Quiz + resultado del agente
│   ├── api/                       # Backend REST
│   └── layout.tsx, page.tsx
├── components/
│   ├── layout/      DashboardShell, TopBar, NavInferior, PWARegister
│   ├── registrar/   CamaraGuia, ConfirmacionOCR, GrabadoraVoz
│   ├── pym-score/   PymScoreCircular
│   ├── shared/      TextoFormateado, CelebracionNivel
│   ├── nivel/       BarraXP, InsigniaSubida
│   ├── dashboard/   GraficoAdaptativo, TarjetaResumen
│   ├── estados/     EstadoCargando, EstadoError, EstadoVacio
│   └── ui/          Componentes shadcn/ui
├── hooks/           useNivel, useNegocio, useVentas, use-toast
├── lib/
│   ├── supabase/    client, server, middleware
│   ├── agente/      categorizacion.ts (onboarding)
│   ├── chatbot/     prompt, contexto, acciones, procesarMensaje, tipos
│   ├── claude.ts, openai.ts, vision.ts
│   ├── vocabulario.ts, nivel.ts, pym-score.ts
│   └── inventario-match.ts, password.ts, utils.ts
├── types/index.ts
├── public/          manifest.json, sw.js, icons/
├── n8n/             Workflow Twilio (activo) + _legacy Meta Cloud API
├── supabase/migrations/
├── docs/            Documentación complementaria
├── .cursor/         Reglas y agentes para Cursor IDE
├── AGENTS.md        Guía para agentes de IA
└── .cursorrules     Contexto completo del proyecto
```

Ver también: [docs/ESTRUCTURA.md](docs/ESTRUCTURA.md)

---

## Requisitos previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- (Opcional) API keys de Anthropic, OpenAI y Google Vision para IA completa
- (Opcional) Cuenta n8n + Twilio WhatsApp Sandbox para chatbot

---

## Configuración local

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd impulsa
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completa las variables (ver sección siguiente).

### 3. Supabase

1. Crea un proyecto en Supabase.
2. En **Authentication → Providers**, desactiva "Confirm email" para desarrollo rápido.
3. En **SQL Editor**, ejecuta las migraciones en orden (ver [Base de datos](#base-de-datos)).
4. Copia `URL`, `anon key` y `service role key` a `.env.local`.

### 4. Arrancar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Variables de entorno

| Variable | Requerida | Uso |
|----------|-----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Solo server (`/api/chatbot`, operaciones privilegiadas) |
| `NEXT_PUBLIC_APP_URL` | Sí | URL base (`http://localhost:3000` en local) |
| `ANTHROPIC_API_KEY` | Recomendada | Claude: OCR foto, estructurar texto, PymScore, onboarding |
| `OPENAI_API_KEY` | Recomendada | Whisper: transcripción de voz en Registrar |
| `GOOGLE_VISION_API_KEY` | Opcional | OCR de guías (fallback mock sin key) |
| `N8N_WEBHOOK_SECRET` | WhatsApp | Secreto compartido n8n ↔ `/api/chatbot` |
| `N8N_API_URL` / `N8N_API_KEY` | Admin | MCP de n8n en Cursor (no runtime de la app) |
| `TWILIO_ACCOUNT_SID` | WhatsApp | Cuenta Twilio (Console; no va en el workflow n8n) |
| `TWILIO_AUTH_TOKEN` | WhatsApp | Token Twilio |
| `TWILIO_WHATSAPP_FROM` | WhatsApp | Número sandbox/sender (`whatsapp:+...`) |

Plantilla completa: [.env.example](.env.example)

---

## Base de datos

Ejecutar en el SQL Editor de Supabase **en este orden**:

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `supabase/migrations/001_schema_inicial.sql` | Schema core + niveles + PymScore + RLS |
| 2 | `supabase/migrations/002_registrar_venta_rpc.sql` | RPC atómica venta + descuento stock |
| 3 | `supabase/migrations/003_rediseno.sql` | Categorías, deuda proveedores, componentes score |
| 4 | `supabase/migrations/004_examen.sql` | Examen de nivel + seed de preguntas |
| 5 | `supabase/migrations/005_conversaciones_wsp.sql` | Estado de conversaciones del chatbot WhatsApp |

Detalle: [supabase/README.md](supabase/README.md)

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `negocios` | Un negocio por usuario (`user_id`) |
| `productos` | Inventario con stock y precios |
| `ventas` / `items_venta` | Ventas registradas |
| `gastos` | Gastos del negocio |
| `clientes` / `proveedores` | Fiado: deudas por cobrar/pagar |
| `progreso_usuario` | Nivel y XP del dueño |
| `modulos` / `progreso_modulos` | Contenido educativo |
| `pym_scores` | Historial del PymScore |
| `preguntas_examen` / `intentos_examen` | Examen de subida de nivel |

**Seguridad:** todas las queries filtran por `negocio_id` (o `user_id` en tablas de niveles). Nunca aceptar `negocio_id` del cliente en API routes.

---

## Navegación y rutas

### Nav inferior (5 secciones)

| Sección | Ruta | Contenido |
|---------|------|-----------|
| Inicio | `/inicio` | Dashboard del día |
| Registrar | `/registrar` | Foto / Voz / Manual |
| Mi Negocio | `/mi-negocio` | Flujo / Inventario / Top / Fiado |
| PymScore | `/pym-score` | Score y expediente |
| Aprender | `/aprender` | Módulos y examen |

### Otras rutas

| Ruta | Descripción |
|------|-------------|
| `/login`, `/registro` | Autenticación |
| `/onboarding` | Quiz post-registro |
| `/` | Redirige a login o inicio |

### Rutas legacy (redirigen automáticamente)

| Ruta antigua | Redirige a |
|--------------|------------|
| `/ventas`, `/ventas/nueva` | `/registrar` |
| `/inventario`, `/inventario/nueva-guia` | `/mi-negocio` o `/registrar` |
| `/gastos` | `/registrar` |
| `/clientes` | `/mi-negocio` |

El código legacy se conserva en `app/(dashboard)/_legacy/` como referencia (carpeta privada, no genera rutas).

---

## API Routes

Todas las rutas (excepto `/api/chatbot`) requieren sesión Supabase y obtienen `negocio_id` de la sesión — **nunca del body**.

### Negocio y dashboard

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/negocio` | Datos del negocio actual |
| GET | `/api/dashboard` | Resumen para Inicio |
| POST | `/api/seed` | Cargar datos de demo |

### Operaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/ventas` | Listar y registrar ventas |
| GET/POST | `/api/inventario` | Inventario |
| POST | `/api/inventario/bulk` | Carga masiva (OCR) |
| GET/POST | `/api/gastos` | Gastos |
| GET/POST/PATCH | `/api/clientes` | Clientes y fiado |
| GET/POST | `/api/proveedores` | Proveedores |
| GET | `/api/mi-negocio/flujo` | Flujo de caja |
| GET | `/api/mi-negocio/top` | Top productos |

### IA (server-side, requiere sesión)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ia/extraer-foto` | Claude lee foto de boleta/guía |
| POST | `/api/ia/transcribir` | Whisper transcribe audio |
| POST | `/api/ia/estructurar` | Claude estructura texto libre |
| POST | `/api/ocr` | Google Vision (legacy OCR) |

### Niveles y PymScore

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/nivel` | Nivel y XP actual |
| POST | `/api/onboarding` | Guardar respuestas del quiz |
| GET | `/api/modulos` | Módulos educativos |
| GET/POST | `/api/examen` | Preguntas y envío de examen |
| GET | `/api/pym-score` | Score y componentes |

### Chatbot WhatsApp

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/chatbot` | Cerebro del asesor WhatsApp (n8n llama aquí). Valida `x-n8n-secret`, resuelve negocio por `telefono_wsp` y delega en `lib/chatbot/`. Detecta intención con Claude, confirma con botones antes de escribir, y registra venta/gasto/compra/fiado. El estado multi-paso vive en `conversaciones_wsp`. |

**Lógica del asesor (`lib/chatbot/`):**

| Archivo | Rol |
|---------|-----|
| `prompt.ts` | System prompt del asesor (identidad, tono, reglas, formato JSON) |
| `contexto.ts` | Nivel del dueño, resumen real del negocio y estado de conversación |
| `acciones.ts` | Ejecutores de venta/gasto/compra/fiado (service role, por `negocio_id`) |
| `procesarMensaje.ts` | Orquestador: contexto + Claude + máquina de confirmación + escritura |
| `tipos.ts` | Tipos compartidos del chatbot |

---

## Sistema de niveles

| Nivel | Nombre | XP | Ejemplo de vocabulario |
|-------|--------|-----|------------------------|
| 1 | Bodeguero | 0–99 | "cuánto ganaste hoy" |
| 2 | Emprendedor | 100–299 | "ganancia neta del mes" |
| 3 | Comerciante | 300–599 | "margen de utilidad" |
| 4 | Empresario | 600+ | "margen de contribución" |

- Usar siempre `vocab('clave')` de `lib/vocabulario.ts` — **nunca hardcodear** términos financieros.
- Hook `useNivel()` expone `{ nivel, vocab, xp, ... }`.
- Features condicionales: `{nivel >= 2 && <PymScore />}`.

---

## Inteligencia artificial

| Función | Proveedor | Archivo / Ruta |
|---------|-----------|----------------|
| Leer foto (boleta/guía) | Claude | `lib/claude.ts` → `/api/ia/extraer-foto` |
| Estructurar texto libre | Claude | `lib/claude.ts` → `/api/ia/estructurar` |
| Transcripción de voz | OpenAI Whisper | `lib/openai.ts` → `/api/ia/transcribir` |
| Categorizar nivel (onboarding) | Claude | `lib/agente/categorizacion.ts` |
| Explicación PymScore | Claude | `lib/claude.ts` |
| OCR guías (legacy) | Google Vision | `lib/vision.ts` → `/api/ocr` |

Las API keys **solo en server**. El cliente nunca llama directo a Anthropic/OpenAI.

---

## WhatsApp y n8n (Twilio)

```
Usuario → Twilio → n8n (webhook) → POST /api/chatbot → TwiML → Twilio → Usuario
```

- **Twilio** recibe/envía WhatsApp; apunta el webhook entrante a n8n.
- **n8n** normaliza el payload, llama a la API y responde TwiML (sin credenciales Twilio en el workflow).
- **Next.js** decide qué responder, consulta Supabase y llama a Claude.
- Workflow activo: [`n8n/impulsa-twilio-whatsapp-twiml.json`](n8n/impulsa-twilio-whatsapp-twiml.json) — ver [`n8n/README.md`](n8n/README.md)
- Webhook producción: `https://impulsa12121.app.n8n.cloud/webhook/impulsa-twilio-whatsapp`
- Estado de conversaciones: tabla `conversaciones_wsp` (migración `005`), gestionada por `lib/chatbot/`.

Contrato esperado por n8n:

```json
// Request
{ "telefono": "51987654321", "mensaje": "vendí 3 sacos", "tipo": "text" }

// Response
{ "respuesta": "¿Confirmas...?", "botones": [{ "id": "confirmar", "titulo": "Sí" }] }
```

---

## Flujo de demo

1. Registrarse en `/registro`
2. Completar onboarding (5 preguntas)
3. En `/inicio`, usar **"Cargar datos de demo"** (botón seed)
4. Registrar una venta en `/registrar` (tab Manual, Voz o Foto)
5. Ver inventario y fiado en `/mi-negocio`
6. Desde nivel 2, explorar `/pym-score`
7. Completar módulos y examen en `/aprender`

---

## Despliegue en Vercel

1. Conecta el repositorio a Vercel.
2. Agrega todas las variables de `.env.example`.
3. `NEXT_PUBLIC_APP_URL` debe ser la URL de producción (misma base que `APP_URL` en n8n).
4. En n8n cloud, configura `APP_URL` y `N8N_WEBHOOK_SECRET` (idéntico al de Vercel).
5. Ejecuta las migraciones SQL en Supabase de producción.
6. Deploy automático en cada push a `main`.

```bash
npm run build   # verificar build local antes de deploy
```

---

## Convenciones de código

- **Mobile-first:** diseño para 390px, botones `min-h-[48px]`, inputs `text-base`.
- **Estados obligatorios:** loading, error y empty en cada página.
- **Feedback:** toast al guardar, `AlertDialog` antes de eliminar.
- **Componentes cliente:** `'use client'` solo cuando hay estado o eventos.
- **API routes:** try/catch, status explícitos (200, 201, 400, 401, 404, 500).
- **Sin tests unitarios** (hackathon de 3 días).

Para agentes de IA trabajando en el repo: leer [AGENTS.md](AGENTS.md) y `.cursorrules`.

---

## Documentación adicional

| Archivo | Contenido |
|---------|-----------|
| [AGENTS.md](AGENTS.md) | Instrucciones para agentes de IA |
| [.cursorrules](.cursorrules) | Contexto completo, schema SQL, prioridades |
| [docs/ARCHIVOS-GENERADOS.md](docs/ARCHIVOS-GENERADOS.md) | Qué son los `.js.map` y carpetas generadas |
| [supabase/README.md](supabase/README.md) | Orden de migraciones |
| `.cursor/rules/` | Reglas por dominio (API, DB, componentes, chatbot) |

---

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
```

---

## Licencia

Proyecto de hackathon — uso interno del equipo Impulsa / IDEATECH PYME 2026.

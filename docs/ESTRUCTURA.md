# Estructura del proyecto

Referencia rápida. La documentación completa está en [README.md](../README.md).

```
impulsa/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login y registro
│   ├── (dashboard)/              # 5 secciones del nav + layout
│   │   ├── _legacy/              # Rutas antiguas (no públicas, solo referencia)
│   │   ├── inicio/
│   │   ├── registrar/
│   │   ├── mi-negocio/
│   │   ├── pym-score/
│   │   └── aprender/
│   ├── onboarding/
│   ├── api/                      # API Routes (ver README)
│   ├── layout.tsx
│   └── page.tsx                  # Redirige a /login o /inicio
├── components/
│   ├── layout/                   # Shell, nav, PWA
│   ├── registrar/                # Cámara, OCR, voz
│   ├── pym-score/                # Gauge circular
│   ├── shared/                   # Texto formateado, celebración nivel
│   ├── nivel/                    # Barra XP, insignia
│   ├── dashboard/                # Gráficos y tarjetas
│   ├── estados/                  # Loading, error, vacío
│   └── ui/                       # shadcn/ui
├── hooks/
├── lib/
│   ├── supabase/                 # Clientes browser/server/middleware
│   ├── agente/                   # Categorización de nivel (Claude)
│   ├── chatbot/                  # Lógica del asesor WhatsApp (procesarMensaje, acciones)
│   └── *.ts                      # vocabulario, pym-score, claude, etc.
├── types/
├── public/                       # PWA: manifest, sw.js, icons
├── n8n/                          # Workflow Twilio activo + README + legacy Meta
├── supabase/migrations/
├── docs/
├── .cursor/                      # Reglas y agentes para Cursor
├── AGENTS.md                     # Guía para agentes de IA
└── .cursorrules                  # Contexto completo del proyecto
```

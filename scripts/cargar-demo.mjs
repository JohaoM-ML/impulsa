#!/usr/bin/env node

const envFile = process.env.DEMO_ENV_FILE ?? '.env.local'
try {
  const { readFileSync } = await import('node:fs')
  const env = readFileSync(envFile, 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^["']|["']$/g, '')
  }
} catch {
  // El script tambien puede funcionar solo con variables de entorno del proceso.
}

function argValue(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

function usage() {
  console.log(`Uso:
  npm run seed:demo -- --negocio-id <uuid>
  npm run seed:demo -- --telefono-wsp <51999999999>
  npm run seed:demo -- --user-id <uuid>

Variables requeridas:
  DEMO_SEED_SECRET=<mismo valor configurado en la app>

Variables opcionales:
  DEMO_SEED_URL=https://tu-app.vercel.app
  NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
  DEMO_ENV_FILE=.env.local`)
}

const negocioId = argValue('--negocio-id')
const telefonoWsp = argValue('--telefono-wsp')
const userId = argValue('--user-id')
const secret = process.env.DEMO_SEED_SECRET
const baseUrl = (process.env.DEMO_SEED_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  .replace(/\/$/, '')

if (process.argv.includes('--help')) {
  usage()
  process.exit(0)
}

if (!secret) {
  console.error('Falta DEMO_SEED_SECRET.')
  usage()
  process.exit(1)
}

if (!negocioId && !telefonoWsp && !userId) {
  console.error('Indica --negocio-id, --telefono-wsp o --user-id.')
  usage()
  process.exit(1)
}

const payload = {
  ...(negocioId ? { negocioId } : {}),
  ...(telefonoWsp ? { telefonoWsp } : {}),
  ...(userId ? { userId } : {}),
}

console.log(`Cargando datos demo en ${baseUrl}...`)

const res = await fetch(`${baseUrl}/api/seed`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-demo-seed-secret': secret,
  },
  body: JSON.stringify(payload),
})

const text = await res.text()
let body
try {
  body = JSON.parse(text)
} catch {
  body = text
}

if (!res.ok) {
  console.error('No se pudo cargar la demo:')
  console.error(body)
  process.exit(1)
}

console.log('Datos demo cargados:')
console.log(body)

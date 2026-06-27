import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { procesarResumenesDiarios } from '@/lib/resumen-diario'
import { twilioConfigurado } from '@/lib/twilio'

function autorizadoCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

/**
 * Cron de Vercel: cada 30 min revisa negocios cuya hora de cierre ya pasó
 * y envía el resumen diario por WhatsApp (Twilio).
 */
export async function GET(request: NextRequest) {
  if (!autorizadoCron(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!twilioConfigurado()) {
    return NextResponse.json({ error: 'Twilio no configurado' }, { status: 503 })
  }

  try {
    const supabase = createServiceClient()
    const resultado = await procesarResumenesDiarios(supabase)
    return NextResponse.json({ ok: true, ...resultado })
  } catch (err) {
    console.error('[GET /api/cron/resumen-diario]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

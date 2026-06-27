import { NextRequest, NextResponse } from 'next/server'
import { procesarPedidosProactivos } from '@/lib/pedido-proactivo'
import { createServiceClient } from '@/lib/supabase/server'
import { twilioConfigurado } from '@/lib/twilio'

function autorizadoCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

/**
 * Cron de Vercel: envia Compra Inteligente por WhatsApp cuando hay visita de
 * proveedor hoy o manana. Evita duplicados por negocio con ultimo_pedido_enviado.
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
    const resultado = await procesarPedidosProactivos(supabase)
    return NextResponse.json({ ok: true, ...resultado })
  } catch (err) {
    console.error('[GET /api/cron/pedido-proactivo]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

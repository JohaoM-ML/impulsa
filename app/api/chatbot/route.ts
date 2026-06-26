import { procesarMensaje } from '@/lib/chatbot/procesarMensaje'
import type { TipoMensajeChatbot } from '@/lib/chatbot/tipos'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function normalizarTelefono(raw: string): string {
  return raw
    .trim()
    .replace(/^whatsapp:/i, '')
    .replace(/^\+/, '')
    .replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-n8n-secret')
    if (!process.env.N8N_WEBHOOK_SECRET || secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const telefono = typeof body.telefono === 'string' ? normalizarTelefono(body.telefono) : ''
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje : ''
    const tipo: TipoMensajeChatbot =
      body.tipo === 'button_reply' || body.tipo === 'image' ? body.tipo : 'text'

    if (!telefono) {
      return NextResponse.json({ respuesta: 'No pude identificar tu número. Intenta de nuevo.' })
    }

    const supabase = createServiceClient()
    const { data: negocio, error } = await supabase
      .from('negocios')
      .select('*')
      .in('telefono_wsp', [telefono, `+${telefono}`, `whatsapp:+${telefono}`])
      .maybeSingle()

    if (error) throw error

    if (!negocio) {
      return NextResponse.json({
        respuesta: 'Tu número no está registrado en Impulsa. Regístrate en la app primero.',
      })
    }

    const resultado = await procesarMensaje(negocio, telefono, mensaje, tipo)
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[POST /api/chatbot]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

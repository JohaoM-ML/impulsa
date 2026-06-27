import { NextResponse } from 'next/server'
import { construirCompraInteligente } from '@/lib/compra-inteligente-server'
import { formatearPedidoWhatsApp } from '@/lib/chatbot/formato-pedido'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { enviarWhatsApp, twilioConfigurado } from '@/lib/twilio'

function normalizarTelefono(raw: string): string {
  return raw
    .trim()
    .replace(/^whatsapp:/i, '')
    .replace(/^\+/, '')
    .replace(/\D/g, '')
}

export async function POST() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json(
        { error: error ?? 'Negocio no encontrado' },
        { status: error === 'No autorizado' ? 401 : 404 }
      )
    }

    if (!negocio.telefono_wsp) {
      return NextResponse.json({ error: 'Este negocio no tiene WhatsApp registrado' }, { status: 400 })
    }
    if (!twilioConfigurado()) {
      return NextResponse.json({ error: 'Twilio no configurado para envío' }, { status: 503 })
    }

    const resumen = await construirCompraInteligente(supabase, negocio)
    await enviarWhatsApp(normalizarTelefono(negocio.telefono_wsp), formatearPedidoWhatsApp(resumen))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/compra-inteligente/enviar]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

import { guardarRespuestaMessageSid, reservarMessageSid } from '@/lib/chatbot/idempotencia'
import { procesarMensaje } from '@/lib/chatbot/procesarMensaje'
import { leerComprobantePago } from '@/lib/claude'
import { cargarConversacion, guardarConversacion } from '@/lib/chatbot/contexto'
import {
  descargarMediaTwilio,
  transcribirMediaTwilio,
  twilioMediaConfigurado,
  twilioMediaImagenConfigurado,
} from '@/lib/chatbot/twilio-media'
import type { RequestChatbot, TipoMensajeChatbot } from '@/lib/chatbot/tipos'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function normalizarTelefono(raw: string): string {
  return raw
    .trim()
    .replace(/^whatsapp:/i, '')
    .replace(/^\+/, '')
    .replace(/\D/g, '')
}

function parseTipo(body: Record<string, unknown>): TipoMensajeChatbot {
  const t = body.tipo
  if (t === 'button_reply' || t === 'image' || t === 'audio') return t
  return 'text'
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-n8n-secret')
    if (!process.env.N8N_WEBHOOK_SECRET || secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = (await request.json()) as RequestChatbot & Record<string, unknown>
    const telefono = typeof body.telefono === 'string' ? normalizarTelefono(body.telefono) : ''
    let mensaje = typeof body.mensaje === 'string' ? body.mensaje : ''
    const tipo = parseTipo(body)
    const messageSid =
      typeof body.messageSid === 'string'
        ? body.messageSid
        : typeof body.MessageSid === 'string'
          ? body.MessageSid
          : undefined
    const mediaUrl = typeof body.mediaUrl === 'string' ? body.mediaUrl : undefined
    const mediaContentType =
      typeof body.mediaContentType === 'string' ? body.mediaContentType : undefined

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

    const { duplicado, respuesta: respuestaCacheada } = await reservarMessageSid(
      supabase,
      negocio.id,
      telefono,
      messageSid
    )
    if (duplicado && respuestaCacheada) {
      return NextResponse.json(respuestaCacheada)
    }

    if (tipo === 'audio') {
      if (!mediaUrl) {
        return NextResponse.json({
          respuesta: 'Recibí un audio pero no pude abrirlo. Escríbeme la venta en texto.',
        })
      }
      if (!twilioMediaConfigurado()) {
        return NextResponse.json({
          respuesta:
            'Por ahora no puedo escuchar audios por WhatsApp. Escríbeme la venta en texto.',
        })
      }
      try {
        mensaje = await transcribirMediaTwilio(mediaUrl, mediaContentType)
      } catch (err) {
        console.error('[POST /api/chatbot] transcribir audio', err)
        return NextResponse.json({
          respuesta: 'No pude entender el audio. ¿Me lo escribes en texto?',
        })
      }
      if (!mensaje.trim()) {
        return NextResponse.json({
          respuesta: 'El audio sonó vacío. ¿Me repites la venta en texto?',
        })
      }
    }

    if (tipo === 'image') {
      if (!mediaUrl) {
        return NextResponse.json({
          respuesta: 'Recibí una imagen pero no pude abrirla. Envíame otra captura o escribe la venta.',
        })
      }
      if (!twilioMediaImagenConfigurado()) {
        return NextResponse.json({
          respuesta: 'Por ahora no puedo leer imágenes por WhatsApp. Escríbeme el monto y la venta.',
        })
      }

      try {
        const media = await descargarMediaTwilio(mediaUrl, mediaContentType)
        const comprobante = await leerComprobantePago(media.dataUrl)
        if (!comprobante.monto || !comprobante.medio_pago) {
          return NextResponse.json({
            respuesta: 'No pude leer el monto o el medio de pago. Escríbeme la venta en texto, por favor.',
          })
        }

        const path = `${negocio.user_id}/${negocio.id}/${Date.now()}.${media.extension}`
        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(path, media.buffer, {
            contentType: mediaContentType ?? `image/${media.extension === 'jpg' ? 'jpeg' : media.extension}`,
            upsert: false,
          })
        if (uploadError) throw uploadError

        const estado = await cargarConversacion(supabase, negocio.id, telefono)
        const textoComprobante = `Comprobante ${comprobante.medio_pago} por S/ ${comprobante.monto.toFixed(2)}`
        await guardarConversacion(supabase, negocio.id, telefono, {
          estado_flujo: 'esperando_datos',
          contexto: {
            intent: 'registrar_venta',
            datos_parciales: {
              total: comprobante.monto,
              medio_pago: comprobante.medio_pago,
              comprobante_url: path,
            },
            comprobante_pago: {
              monto: comprobante.monto,
              medio_pago: comprobante.medio_pago,
              comprobante_url: path,
              operacion: comprobante.operacion ?? null,
            },
          },
          historial: [
            ...estado.historial,
            { rol: 'usuario', texto: textoComprobante },
          ],
        })

        if (mensaje.trim()) {
          const resultado = await procesarMensaje(negocio, telefono, mensaje, 'text')
          await guardarRespuestaMessageSid(supabase, messageSid, resultado)
          return NextResponse.json(resultado)
        }

        const respuesta = {
          respuesta: `Listo, recibí S/ ${comprobante.monto.toFixed(2)} por ${comprobante.medio_pago.toUpperCase()}. ¿Qué producto y cantidad vendiste?`,
        }
        await guardarRespuestaMessageSid(supabase, messageSid, respuesta)
        return NextResponse.json(respuesta)
      } catch (err) {
        console.error('[POST /api/chatbot] procesar imagen', err)
        return NextResponse.json({
          respuesta: 'No pude leer esa imagen. Envíame otra captura o escríbeme la venta.',
        })
      }
    }

    const resultado = await procesarMensaje(negocio, telefono, mensaje, tipo)
    await guardarRespuestaMessageSid(supabase, messageSid, resultado)
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[POST /api/chatbot]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

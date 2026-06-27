import type { ResponseChatbot, ServiceClient } from '@/lib/chatbot/tipos'

/**
 * Reserva un MessageSid de Twilio antes de procesar.
 * Si ya fue procesado, devuelve la respuesta cacheada (idempotencia).
 */
export async function reservarMessageSid(
  supabase: ServiceClient,
  negocioId: string,
  telefono: string,
  messageSid: string | undefined
): Promise<{ duplicado: boolean; respuesta?: ResponseChatbot }> {
  if (!messageSid?.trim()) return { duplicado: false }

  const sid = messageSid.trim()

  const { data: existente } = await supabase
    .from('mensajes_wsp_procesados')
    .select('respuesta')
    .eq('message_sid', sid)
    .maybeSingle()

  if (existente?.respuesta && typeof existente.respuesta === 'object') {
    return { duplicado: true, respuesta: existente.respuesta as ResponseChatbot }
  }

  const { error } = await supabase.from('mensajes_wsp_procesados').insert({
    message_sid: sid,
    negocio_id: negocioId,
    telefono,
    respuesta: null,
  })

  if (error?.code === '23505') {
    const { data: retry } = await supabase
      .from('mensajes_wsp_procesados')
      .select('respuesta')
      .eq('message_sid', sid)
      .maybeSingle()
    if (retry?.respuesta && typeof retry.respuesta === 'object') {
      return { duplicado: true, respuesta: retry.respuesta as ResponseChatbot }
    }
    return {
      duplicado: true,
      respuesta: { respuesta: 'Ya recibí ese mensaje. Dame un segundo.' },
    }
  }

  if (error) throw error
  return { duplicado: false }
}

/** Guarda la respuesta final asociada al MessageSid. */
export async function guardarRespuestaMessageSid(
  supabase: ServiceClient,
  messageSid: string | undefined,
  respuesta: ResponseChatbot
): Promise<void> {
  if (!messageSid?.trim()) return
  await supabase
    .from('mensajes_wsp_procesados')
    .update({ respuesta })
    .eq('message_sid', messageSid.trim())
}

import type { Negocio } from '@/types'
import { getAnthropicClient, MODELO_CLAUDE } from '@/lib/claude'
import { createServiceClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_ASESOR } from '@/lib/chatbot/prompt'
import {
  cargarConversacion,
  cargarNivel,
  construirResumenNegocio,
  guardarConversacion,
} from '@/lib/chatbot/contexto'
import { ejecutarAccion, esAccionDeEscritura } from '@/lib/chatbot/acciones'
import type {
  AccionChatbot,
  EstadoConversacion,
  ResponseChatbot,
  TipoMensajeChatbot,
  TurnoHistorial,
} from '@/lib/chatbot/tipos'

const NOMBRES_NIVEL = ['', 'Bodeguero', 'Emprendedor', 'Comerciante', 'Empresario']

/** Convierte el id de un botón en un texto natural para el agente. */
function textoDeMensaje(mensaje: string, tipo: TipoMensajeChatbot): string {
  if (tipo !== 'button_reply') return mensaje
  if (mensaje === 'confirmar') return 'Sí, confirmo.'
  if (mensaje === 'cancelar') return 'No, cancela eso.'
  return mensaje
}

/** Extrae el primer objeto JSON de la respuesta del modelo. */
function parsearSalida(texto: string): ResponseChatbot | null {
  const inicio = texto.indexOf('{')
  const fin = texto.lastIndexOf('}')
  if (inicio === -1 || fin === -1 || fin <= inicio) return null
  try {
    const obj = JSON.parse(texto.slice(inicio, fin + 1)) as ResponseChatbot
    if (typeof obj.respuesta !== 'string') return null
    return obj
  } catch {
    return null
  }
}

function construirContextoSistema(
  negocio: Negocio,
  nivel: number,
  resumen: string,
  estado: EstadoConversacion
): string {
  const pendiente = estado.contexto.accion
    ? `Hay una acción PENDIENTE de confirmar: ${JSON.stringify(estado.contexto.accion)}. ` +
      `Si el usuario confirma, responde con accion.estado="confirmada".`
    : 'No hay ninguna acción pendiente de confirmar.'

  return `${SYSTEM_PROMPT_ASESOR}

# CONTEXTO ACTUAL (datos reales, úsalos y no inventes)
Nivel del dueño: ${nivel} (${NOMBRES_NIVEL[nivel] ?? 'Bodeguero'})
Estado de la conversación: ${estado.estado_flujo}
${pendiente}

RESUMEN DEL NEGOCIO:
${resumen}`
}

/**
 * Procesa un mensaje entrante de WhatsApp con el asesor de Impulsa.
 * Orquesta: contexto real del negocio + Claude + máquina de estados de
 * confirmación + escritura en Supabase (solo cuando el usuario confirma).
 */
export async function procesarMensaje(
  negocio: Negocio,
  telefono: string,
  mensaje: string,
  tipo: TipoMensajeChatbot
): Promise<ResponseChatbot> {
  const supabase = createServiceClient()

  const [nivel, estado, resumen] = await Promise.all([
    cargarNivel(supabase, negocio.user_id),
    cargarConversacion(supabase, negocio.id, telefono),
    construirResumenNegocio(supabase, negocio),
  ])

  const textoUsuario = textoDeMensaje(mensaje, tipo)

  // Sin API key: degradar con elegancia, sin tocar la base de datos.
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      respuesta: `Hola ${negocio.nombre}, te leo. Por ahora no puedo procesar tu mensaje, inténtalo más tarde.`,
    }
  }

  const system = construirContextoSistema(negocio, nivel, resumen, estado)

  const mensajesPrevios = estado.historial.map((t) => ({
    role: t.rol === 'usuario' ? ('user' as const) : ('assistant' as const),
    content: t.texto,
  }))

  let parsed: ResponseChatbot | null = null
  try {
    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 700,
      system,
      messages: [...mensajesPrevios, { role: 'user', content: textoUsuario }],
    })
    const block = message.content[0]
    parsed = block?.type === 'text' ? parsearSalida(block.text) : null
  } catch (err) {
    console.error('[chatbot] Claude', err)
  }

  if (!parsed) {
    return { respuesta: 'No te entendí bien. ¿Me lo repites en pocas palabras?' }
  }

  const accion: AccionChatbot | undefined = parsed.accion
  let respuestaFinal = parsed.respuesta
  let botones = parsed.botones
  const nuevoEstado: EstadoConversacion = { estado_flujo: 'idle', contexto: {}, historial: estado.historial }

  const pendiente = estado.contexto.accion
  const confirmando =
    estado.estado_flujo === 'esperando_confirmacion' &&
    !!pendiente &&
    (accion?.estado === 'confirmada' || (tipo === 'button_reply' && mensaje === 'confirmar'))

  if (confirmando && pendiente) {
    const datos = Object.keys(pendiente.datos ?? {}).length ? pendiente.datos : accion?.datos ?? {}
    const resultado = await ejecutarAccion(supabase, negocio, pendiente.tipo, datos)
    if (!resultado.ok) respuestaFinal = `${resultado.resumen} ¿Lo intentamos de nuevo?`
    botones = undefined
  } else if (accion?.estado === 'confirmada' && esAccionDeEscritura(accion.tipo)) {
    // Confirmación en un solo turno (sin pendiente previo).
    const resultado = await ejecutarAccion(supabase, negocio, accion.tipo, accion.datos ?? {})
    if (!resultado.ok) respuestaFinal = `${resultado.resumen} ¿Lo intentamos de nuevo?`
    botones = undefined
  } else if (accion?.estado === 'pendiente_confirmacion' && esAccionDeEscritura(accion.tipo)) {
    // Guardar acción pendiente y pedir confirmación.
    nuevoEstado.estado_flujo = 'esperando_confirmacion'
    nuevoEstado.contexto = { accion: { tipo: accion.tipo, datos: accion.datos ?? {} } }
    if (!botones?.length) {
      botones = [
        { id: 'confirmar', titulo: 'Sí' },
        { id: 'cancelar', titulo: 'No' },
      ]
    }
  }

  const historial: TurnoHistorial[] = [
    ...estado.historial,
    { rol: 'usuario', texto: textoUsuario },
    { rol: 'asesor', texto: respuestaFinal },
  ]
  nuevoEstado.historial = historial

  try {
    await guardarConversacion(supabase, negocio.id, telefono, nuevoEstado)
  } catch (err) {
    console.error('[chatbot] guardarConversacion', err)
  }

  return { respuesta: respuestaFinal, ...(botones?.length ? { botones } : {}) }
}

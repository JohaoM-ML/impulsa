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
import { accionDatosCompletos, limpiarDatosAccion } from '@/lib/chatbot/validacion'
import type {
  AccionChatbot,
  EstadoConversacion,
  ResponseChatbot,
  TipoMensajeChatbot,
  TurnoHistorial,
} from '@/lib/chatbot/tipos'

const NOMBRES_NIVEL = ['', 'Bodeguero', 'Emprendedor', 'Comerciante', 'Empresario']

function textoDeMensaje(mensaje: string, tipo: TipoMensajeChatbot): string {
  if (tipo !== 'button_reply') return mensaje
  if (mensaje === 'confirmar') return 'Sí, confirmo.'
  if (mensaje === 'cancelar') return 'No, cancela eso.'
  return mensaje
}

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
  const partes: string[] = []

  if (estado.contexto.datos_parciales && Object.keys(estado.contexto.datos_parciales).length) {
    partes.push(
      `Datos PARCIALES acumulados (continúa desde aquí, no reinicies): ${JSON.stringify(estado.contexto.datos_parciales)}`
    )
  }

  if (estado.contexto.accion) {
    partes.push(
      `Hay una acción PENDIENTE de confirmar: ${JSON.stringify(estado.contexto.accion)}. ` +
        `Si el usuario confirma, responde con accion.estado="confirmada".`
    )
  } else if (estado.estado_flujo === 'esperando_datos') {
    partes.push(
      'Estás esperando que el usuario complete datos faltantes (precio, producto, etc.). ' +
        'NO pidas confirmación con botones hasta tener todo completo.'
    )
  } else {
    partes.push('No hay ninguna acción pendiente de confirmar.')
  }

  return `${SYSTEM_PROMPT_ASESOR}

# CONTEXTO ACTUAL (datos reales, úsalos y no inventes)
Nivel del dueño: ${nivel} (${NOMBRES_NIVEL[nivel] ?? 'Bodeguero'})
Estado de la conversación: ${estado.estado_flujo}
${partes.join('\n')}

RESUMEN DEL NEGOCIO:
${resumen}`
}

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

  if (tipo === 'button_reply' && mensaje === 'cancelar') {
    const respuesta = 'Listo, cancelado. ¿En qué más te ayudo?'
    const nuevoEstado: EstadoConversacion = {
      estado_flujo: 'idle',
      contexto: {},
      historial: [
        ...estado.historial,
        { rol: 'usuario', texto: textoUsuario },
        { rol: 'asesor', texto: respuesta },
      ],
    }
    await guardarConversacion(supabase, negocio.id, telefono, nuevoEstado)
    return { respuesta }
  }

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
  const nuevoEstado: EstadoConversacion = {
    estado_flujo: 'idle',
    contexto: {},
    historial: estado.historial,
  }

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
    const resultado = await ejecutarAccion(supabase, negocio, accion.tipo, accion.datos ?? {})
    if (!resultado.ok) respuestaFinal = `${resultado.resumen} ¿Lo intentamos de nuevo?`
    botones = undefined
  } else if (accion?.estado === 'pendiente_confirmacion' && esAccionDeEscritura(accion.tipo)) {
    const datos = limpiarDatosAccion(accion.datos ?? {})
    const completos = accionDatosCompletos(accion.tipo, datos)

    if (!completos) {
      nuevoEstado.estado_flujo = 'esperando_datos'
      nuevoEstado.contexto = {
        datos_parciales: datos,
        intent: accion.tipo,
      }
      botones = undefined
    } else {
      nuevoEstado.estado_flujo = 'esperando_confirmacion'
      nuevoEstado.contexto = { accion: { tipo: accion.tipo, datos } }
      if (!botones?.length) {
        botones = [
          { id: 'confirmar', titulo: 'Sí' },
          { id: 'cancelar', titulo: 'No' },
        ]
      }
    }
  } else if (
    estado.estado_flujo === 'esperando_datos' &&
    accion &&
    esAccionDeEscritura(accion.tipo)
  ) {
    const merged = limpiarDatosAccion({
      ...(estado.contexto.datos_parciales ?? {}),
      ...(accion.datos ?? {}),
    })
    if (accionDatosCompletos(accion.tipo, merged)) {
      nuevoEstado.estado_flujo = 'esperando_confirmacion'
      nuevoEstado.contexto = { accion: { tipo: accion.tipo, datos: merged } }
      botones = [
        { id: 'confirmar', titulo: 'Sí' },
        { id: 'cancelar', titulo: 'No' },
      ]
    } else {
      nuevoEstado.estado_flujo = 'esperando_datos'
      nuevoEstado.contexto = { datos_parciales: merged, intent: accion.tipo }
      botones = undefined
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

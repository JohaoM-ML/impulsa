import type { Negocio } from '@/types'
import { getAnthropicClient, MODELO_CLAUDE } from '@/lib/claude'
import { construirCompraInteligente } from '@/lib/compra-inteligente-server'
import { createServiceClient } from '@/lib/supabase/server'
import { NOMBRES_NIVEL, vocab, type Nivel } from '@/lib/vocabulario'
import { guiaTono } from '@/lib/tono'
import { SYSTEM_PROMPT_ASESOR } from '@/lib/chatbot/prompt'
import {
  cargarConversacion,
  cargarNivel,
  construirResumenNegocio,
  guardarConversacion,
} from '@/lib/chatbot/contexto'
import { ejecutarAccion, esAccionDeEscritura } from '@/lib/chatbot/acciones'
import { esAccionDeConsulta, resolverConsultaAsesor } from '@/lib/chatbot/consultas'
import { accionDatosCompletos, limpiarDatosAccion } from '@/lib/chatbot/validacion'
import type {
  AccionChatbot,
  EstadoConversacion,
  ResponseChatbot,
  TipoMensajeChatbot,
  TurnoHistorial,
} from '@/lib/chatbot/tipos'

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

function esConsultaPedido(mensaje: string): boolean {
  const texto = mensaje.trim().toLowerCase()
  return (
    texto === 'mi pedido' ||
    texto === 'pedido' ||
    texto.includes('qué pido') ||
    texto.includes('que pido') ||
    texto.includes('compra inteligente')
  )
}

function formatearPedidoWhatsApp(resumen: Awaited<ReturnType<typeof construirCompraInteligente>>): string {
  const urgentes = resumen.grupos.pedir.slice(0, 3)
  if (!urgentes.length) return resumen.mensajeChaski

  return [
    resumen.mensajeChaski,
    ...urgentes.map((p) => `- ${p.nombre}: ${p.cantidad_pedir} ${p.unidad}`),
  ]
    .join('\n')
    .slice(0, 900)
}

function completarVentaConComprobante(datos: Record<string, unknown>): Record<string, unknown> {
  const total = Number(datos.total)
  const items = Array.isArray(datos.items) ? (datos.items as Record<string, unknown>[]) : []
  if (!Number.isFinite(total) || total <= 0 || items.length !== 1) return datos

  const item = items[0]
  const cantidad = Number(item.cantidad)
  const precioActual = Number(item.precio_unit)
  if (!Number.isFinite(cantidad) || cantidad <= 0 || (Number.isFinite(precioActual) && precioActual > 0)) {
    return datos
  }

  return {
    ...datos,
    items: [
      {
        ...item,
        precio_unit: Math.round((total / cantidad) * 100) / 100,
      },
    ],
  }
}

function construirContextoSistema(
  negocio: Negocio,
  nivel: Nivel,
  resumen: string,
  estado: EstadoConversacion
): string {
  const partes: string[] = []

  if (estado.contexto.datos_parciales && Object.keys(estado.contexto.datos_parciales).length) {
    partes.push(
      `Datos PARCIALES acumulados (continúa desde aquí, no reinicies): ${JSON.stringify(estado.contexto.datos_parciales)}`
    )
  }

  if (estado.contexto.comprobante_pago) {
    partes.push(
      `Comprobante de pago detectado: ${JSON.stringify(estado.contexto.comprobante_pago)}. ` +
        'El usuario solo debe completar producto y cantidad; calcula precio_unit = monto / cantidad si falta.'
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

VOCABULARIO DEL NIVEL:
- ganancia: ${vocab('ganancia', nivel)}
- gastos: ${vocab('gasto', nivel)}
- inventario bajo: ${vocab('inventario_bajo', nivel)}
- deudas por cobrar: ${vocab('deuda_cobrar', nivel)}
- salud financiera: ${vocab('salud_financiera', nivel)}

GUÍA DE TONO DEL NIVEL:
${guiaTono(nivel)}

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

  if (esConsultaPedido(textoUsuario)) {
    const resumenPedido = await construirCompraInteligente(supabase, negocio)
    const respuesta = formatearPedidoWhatsApp(resumenPedido)
    await guardarConversacion(supabase, negocio.id, telefono, {
      estado_flujo: 'idle',
      contexto: {},
      historial: [
        ...estado.historial,
        { rol: 'usuario', texto: textoUsuario },
        { rol: 'asesor', texto: respuesta },
      ],
    })
    return { respuesta }
  }

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

  if (tipo === 'button_reply' && mensaje === 'ver_score') {
    const respuesta = await resolverConsultaAsesor(supabase, negocio, 'consultar_salud', nivel)
    await guardarConversacion(supabase, negocio.id, telefono, {
      estado_flujo: 'idle',
      contexto: {},
      historial: [
        ...estado.historial,
        { rol: 'usuario', texto: textoUsuario },
        { rol: 'asesor', texto: respuesta },
      ],
    })
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

  if (accion && esAccionDeConsulta(accion.tipo)) {
    respuestaFinal = await resolverConsultaAsesor(supabase, negocio, accion.tipo, nivel)
    botones = undefined
  } else if (confirmando && pendiente) {
    const datos = completarVentaConComprobante(
      Object.keys(pendiente.datos ?? {}).length ? pendiente.datos : accion?.datos ?? {}
    )
    const resultado = await ejecutarAccion(supabase, negocio, pendiente.tipo, datos)
    if (!resultado.ok) respuestaFinal = `${resultado.resumen} ¿Lo intentamos de nuevo?`
    botones = undefined
  } else if (accion?.estado === 'confirmada' && esAccionDeEscritura(accion.tipo)) {
    const resultado = await ejecutarAccion(
      supabase,
      negocio,
      accion.tipo,
      completarVentaConComprobante(accion.datos ?? {})
    )
    if (!resultado.ok) respuestaFinal = `${resultado.resumen} ¿Lo intentamos de nuevo?`
    botones = undefined
  } else if (accion?.estado === 'pendiente_confirmacion' && esAccionDeEscritura(accion.tipo)) {
    const datos = completarVentaConComprobante(limpiarDatosAccion(accion.datos ?? {}))
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
    const merged = completarVentaConComprobante(limpiarDatosAccion({
      ...(estado.contexto.datos_parciales ?? {}),
      ...(accion.datos ?? {}),
    }))
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

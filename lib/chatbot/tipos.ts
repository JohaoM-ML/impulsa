import type { createServiceClient } from '@/lib/supabase/server'
import type { Nivel } from '@/lib/vocabulario'
import type { MedioPago } from '@/types'

export type ServiceClient = ReturnType<typeof createServiceClient>

export type TipoMensajeChatbot = 'text' | 'button_reply' | 'image' | 'audio'

export type TipoAccion =
  | 'registrar_venta'
  | 'registrar_gasto'
  | 'registrar_compra'
  | 'registrar_fiado'
  | 'consultar_resumen'
  | 'consultar_flujo'
  | 'consultar_deudas'
  | 'consultar_inventario'
  | 'consultar_salud'
  | 'consultar_pedido'
  | 'consultar_medios_pago'
  | 'ninguna'

export type EstadoAccion = 'pendiente_confirmacion' | 'confirmada' | 'n/a'

export interface BotonChatbot {
  id: string
  titulo: string
}

export interface AccionChatbot {
  tipo: TipoAccion
  estado: EstadoAccion
  datos: Record<string, unknown>
}

/** Lo que el agente Claude devuelve (JSON) y el contrato hacia n8n. */
export interface ResponseChatbot {
  respuesta: string
  botones?: BotonChatbot[]
  accion?: AccionChatbot
}

export interface TurnoHistorial {
  rol: 'usuario' | 'asesor'
  texto: string
}

export interface ContextoConversacion {
  accion?: { tipo: TipoAccion; datos: Record<string, unknown> }
  datos_parciales?: Record<string, unknown>
  comprobante_pago?: {
    monto: number
    medio_pago: MedioPago
    comprobante_url?: string | null
    operacion?: string | null
  }
  intent?: TipoAccion
}

export interface EstadoConversacion {
  estado_flujo: 'idle' | 'esperando_datos' | 'esperando_confirmacion'
  contexto: ContextoConversacion
  historial: TurnoHistorial[]
}

export interface RequestChatbot {
  telefono: string
  mensaje: string
  tipo: TipoMensajeChatbot
  messageSid?: string
  mediaUrl?: string
  mediaContentType?: string
}

export interface ContextoNegocio {
  nivel: Nivel
  resumen: string
}

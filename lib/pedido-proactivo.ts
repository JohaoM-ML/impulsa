import type { Negocio } from '@/types'
import { construirCompraInteligente } from '@/lib/compra-inteligente-server'
import { formatearPedidoWhatsApp } from '@/lib/chatbot/formato-pedido'
import type { ServiceClient } from '@/lib/chatbot/tipos'
import { enviarWhatsApp } from '@/lib/twilio'
import { hoyEnPeruISO } from '@/lib/timezone'

interface NegocioPedido extends Negocio {
  ultimo_pedido_enviado?: string | null
}

interface ProveedorVisita {
  negocio_id: string
  dia_visita: number | null
}

export interface ResultadoPedidosProactivos {
  enviados: number
  omitidos: number
  errores: number
}

function normalizarTelefono(raw: string): string {
  return raw
    .trim()
    .replace(/^whatsapp:/i, '')
    .replace(/^\+/, '')
    .replace(/\D/g, '')
}

function diaSemanaPeru(offsetDias = 0): number {
  const base = new Date(`${hoyEnPeruISO()}T12:00:00-05:00`)
  base.setUTCDate(base.getUTCDate() + offsetDias)
  return base.getUTCDay()
}

function debeRecibirPedido(
  negocio: NegocioPedido,
  proveedores: ProveedorVisita[],
  hoy: string,
  diaHoy: number,
  diaManana: number
): boolean {
  if (!negocio.telefono_wsp) return false
  if (negocio.ultimo_pedido_enviado === hoy) return false
  return proveedores.some((p) => p.dia_visita === diaHoy || p.dia_visita === diaManana)
}

export async function procesarPedidosProactivos(
  supabase: ServiceClient
): Promise<ResultadoPedidosProactivos> {
  const { data: negocios, error } = await supabase
    .from('negocios')
    .select('id, user_id, nombre, rubro, telefono_wsp, medios_pago, ultimo_pedido_enviado, creado_en')
    .not('telefono_wsp', 'is', null)

  if (error) throw error
  if (!negocios?.length) return { enviados: 0, omitidos: 0, errores: 0 }

  const negociosRows = negocios as NegocioPedido[]
  const { data: proveedores, error: proveedoresError } = await supabase
    .from('proveedores')
    .select('negocio_id, dia_visita')
    .in(
      'negocio_id',
      negociosRows.map((n) => n.id)
    )

  if (proveedoresError) throw proveedoresError

  const proveedoresPorNegocio = new Map<string, ProveedorVisita[]>()
  for (const proveedor of (proveedores ?? []) as ProveedorVisita[]) {
    const lista = proveedoresPorNegocio.get(proveedor.negocio_id) ?? []
    lista.push(proveedor)
    proveedoresPorNegocio.set(proveedor.negocio_id, lista)
  }

  const hoy = hoyEnPeruISO()
  const diaHoy = diaSemanaPeru(0)
  const diaManana = diaSemanaPeru(1)
  let enviados = 0
  let omitidos = 0
  let errores = 0

  for (const negocio of negociosRows) {
    const proveedoresNegocio = proveedoresPorNegocio.get(negocio.id) ?? []
    if (!debeRecibirPedido(negocio, proveedoresNegocio, hoy, diaHoy, diaManana)) {
      omitidos++
      continue
    }

    try {
      const resumen = await construirCompraInteligente(supabase, negocio)
      const mensaje = `Tu pedido inteligente para hoy/mañana:\n\n${formatearPedidoWhatsApp(resumen)}`
      await enviarWhatsApp(normalizarTelefono(negocio.telefono_wsp ?? ''), mensaje)
      await supabase.from('negocios').update({ ultimo_pedido_enviado: hoy }).eq('id', negocio.id)
      enviados++
    } catch (err) {
      console.error(`[pedido-proactivo] negocio ${negocio.id}`, err)
      errores++
    }
  }

  return { enviados, omitidos, errores }
}

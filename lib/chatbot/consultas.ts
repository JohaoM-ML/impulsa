import type { Negocio } from '@/types'
import {
  costoDeVenta,
  diagnosticarFlujo,
  resumenFinanciero,
  type VentaConCosto,
} from '@/lib/finanzas'
import { construirCompraInteligente } from '@/lib/compra-inteligente-server'
import { calcularResumenDia } from '@/lib/resumen-diario'
import { recalcularSalud } from '@/lib/salud-server'
import { vocab, type Nivel } from '@/lib/vocabulario'
import type { ServiceClient, TipoAccion } from '@/lib/chatbot/tipos'

const SEMANAS_FLUJO = 4
const MS_SEMANA = 7 * 24 * 60 * 60 * 1000

function soles(monto: number): string {
  return `S/ ${monto.toFixed(2)}`
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

function etiquetaComponente(key: string): string {
  const labels: Record<string, string> = {
    rentabilidad: 'rentabilidad',
    liquidez: 'liquidez',
    deudas: 'deudas',
    consistencia: 'constancia',
    crecimiento: 'crecimiento',
  }
  return labels[key] ?? key
}

function consejoFlujo(diagnostico: ReturnType<typeof diagnosticarFlujo>): string {
  if (diagnostico === 'margen') return 'Revisa precios: algo se está vendiendo con poca ganancia.'
  if (diagnostico === 'costos_fijos') return 'Tus ventas dejan algo, pero los gastos están pesando.'
  if (diagnostico === 'positivo') return 'Vas en azul; sigue registrando para ver el patrón.'
  return 'Aún faltan ventas para darte un diagnóstico claro.'
}

async function consultarResumen(
  supabase: ServiceClient,
  negocio: Negocio,
  nivel: Nivel
): Promise<string> {
  const datos = await calcularResumenDia(supabase, negocio.id)
  const labelVentas = vocab('ventas_hoy', nivel)
  const labelGanancia = vocab('ganancia', nivel)

  const lineas = [
    `Hoy: ${labelVentas} ${soles(datos.totalVentas)} en ${datos.cantidadVentas} venta(s).`,
    `${labelGanancia}: ${soles(datos.ganancias)}. ${vocab('gasto', nivel)}: ${soles(datos.totalGastos)}.`,
  ]

  if (datos.productoTop) {
    lineas.push(`Más vendido: ${datos.productoTop.nombre} (${datos.productoTop.cantidad}).`)
  } else if (datos.stockBajo > 0) {
    lineas.push(`Ojo: ${datos.stockBajo} producto(s) ${vocab('inventario_bajo', nivel)}.`)
  } else {
    lineas.push('Sigue registrando y te aviso qué patrón aparece.')
  }

  return lineas.join('\n')
}

async function consultarFlujo(
  supabase: ServiceClient,
  negocio: Negocio,
  nivel: Nivel
): Promise<string> {
  const desde = new Date(Date.now() - SEMANAS_FLUJO * MS_SEMANA).toISOString()
  const [{ data: ventas }, { data: gastos }] = await Promise.all([
    supabase
      .from('ventas')
      .select('total, items_venta(cantidad, precio_unit, productos(precio_compra))')
      .eq('negocio_id', negocio.id)
      .gte('creado_en', desde),
    supabase.from('gastos').select('monto').eq('negocio_id', negocio.id).gte('creado_en', desde),
  ])

  const ventasArr = (ventas ?? []) as (VentaConCosto & { total: number })[]
  const totalVentas = ventasArr.reduce((s, v) => s + Number(v.total), 0)
  const totalCosto = ventasArr.reduce((s, v) => s + costoDeVenta(v), 0)
  const totalGastos = (gastos ?? []).reduce((s, g: { monto: number }) => s + Number(g.monto), 0)
  const resumen = resumenFinanciero({
    totalVentas,
    costoMercaderia: totalCosto,
    gastosFijos: totalGastos,
  })
  const diagnostico = diagnosticarFlujo(resumen)

  return [
    `En las últimas ${SEMANAS_FLUJO} semanas vendiste ${soles(r2(resumen.ventas))}.`,
    `${vocab('ganancia', nivel)}: ${soles(r2(resumen.gananciaNeta))}. ${vocab('gasto', nivel)}: ${soles(r2(resumen.gastosFijos))}.`,
    consejoFlujo(diagnostico),
  ].join('\n')
}

async function consultarInventario(
  supabase: ServiceClient,
  negocio: Negocio,
  nivel: Nivel
): Promise<string> {
  const { data: productos } = await supabase
    .from('productos')
    .select('nombre, unidad, stock_actual, stock_minimo')
    .eq('negocio_id', negocio.id)
    .eq('activo', true)
    .order('stock_actual', { ascending: true })

  const rows = (productos ?? []) as {
    nombre: string
    unidad: string | null
    stock_actual: number | null
    stock_minimo: number | null
  }[]
  const bajos = rows
    .filter((p) => Number(p.stock_actual ?? 0) <= Number(p.stock_minimo ?? 0))
    .slice(0, 5)
    .map((p) => `${p.nombre}: ${Number(p.stock_actual ?? 0)} ${p.unidad ?? 'unid.'}`)

  if (!rows.length) return 'Aún no tienes productos en inventario. Registra una compra y lo armamos.'
  if (!bajos.length) return `Tu inventario se ve estable. No veo productos con ${vocab('inventario_bajo', nivel)}.`

  return [
    `Tienes ${bajos.length} producto(s) con ${vocab('inventario_bajo', nivel)}:`,
    bajos.join(', '),
    `Si quieres, dime “${vocab('abastecer', nivel)}” y te armo el pedido.`,
  ].join('\n')
}

async function consultarDeudas(
  supabase: ServiceClient,
  negocio: Negocio,
  nivel: Nivel
): Promise<string> {
  const [{ data: clientes }, { data: proveedores }] = await Promise.all([
    supabase
      .from('clientes')
      .select('nombre, deuda_total')
      .eq('negocio_id', negocio.id)
      .gt('deuda_total', 0)
      .order('deuda_total', { ascending: false }),
    supabase
      .from('proveedores')
      .select('nombre, deuda_total')
      .eq('negocio_id', negocio.id)
      .gt('deuda_total', 0)
      .order('deuda_total', { ascending: false }),
  ])

  const clientesRows = (clientes ?? []) as { nombre: string; deuda_total: number | null }[]
  const proveedoresRows = (proveedores ?? []) as { nombre: string; deuda_total: number | null }[]
  const totalCobrar = clientesRows.reduce((s, c) => s + Number(c.deuda_total ?? 0), 0)
  const totalPagar = proveedoresRows.reduce((s, p) => s + Number(p.deuda_total ?? 0), 0)

  if (totalCobrar <= 0 && totalPagar <= 0) return 'Por ahora no veo deudas pendientes. Bien ordenado.'

  const topClientes = clientesRows
    .slice(0, 3)
    .map((c) => `${c.nombre} ${soles(Number(c.deuda_total ?? 0))}`)
  const topProveedores = proveedoresRows
    .slice(0, 2)
    .map((p) => `${p.nombre} ${soles(Number(p.deuda_total ?? 0))}`)

  return [
    `${vocab('deuda_cobrar', nivel)}: ${soles(totalCobrar)}${topClientes.length ? ` (${topClientes.join(', ')})` : ''}.`,
    `Por pagar a proveedores: ${soles(totalPagar)}${topProveedores.length ? ` (${topProveedores.join(', ')})` : ''}.`,
    totalCobrar > 0 ? 'Conviene cobrar primero los montos más grandes.' : 'Mantén anotado cada abono.',
  ].join('\n')
}

async function consultarSalud(
  supabase: ServiceClient,
  negocio: Negocio,
  nivel: Nivel
): Promise<string> {
  const salud = await recalcularSalud(supabase, negocio)
  const componentes = (salud.componentes ?? {}) as Record<string, number>
  const peor = Object.entries(componentes).sort((a, b) => Number(a[1]) - Number(b[1]))[0]
  const foco = peor ? etiquetaComponente(peor[0]) : 'registro diario'
  const explicacion = typeof salud.explicacion === 'string' ? salud.explicacion.trim() : ''

  return [
    `${vocab('salud_financiera', nivel)} está en ${Number(salud.indice ?? 0)}/100.`,
    explicacion || `El punto a cuidar ahora es ${foco}.`,
    `Siguiente paso: registra ventas y gastos cada día para fortalecer ${foco}.`,
  ]
    .join('\n')
    .slice(0, 900)
}

async function consultarPedido(supabase: ServiceClient, negocio: Negocio): Promise<string> {
  const resumen = await construirCompraInteligente(supabase, negocio)
  const urgentes = resumen.grupos.pedir.slice(0, 3)
  if (!urgentes.length) return resumen.mensajeChaski

  return [
    resumen.mensajeChaski,
    ...urgentes.map((p) => `- ${p.nombre}: ${p.cantidad_pedir} ${p.unidad}`),
  ]
    .join('\n')
    .slice(0, 900)
}

export function esAccionDeConsulta(tipo: TipoAccion | undefined): boolean {
  return (
    tipo === 'consultar_resumen' ||
    tipo === 'consultar_flujo' ||
    tipo === 'consultar_deudas' ||
    tipo === 'consultar_inventario' ||
    tipo === 'consultar_salud' ||
    tipo === 'consultar_pedido'
  )
}

export async function resolverConsultaAsesor(
  supabase: ServiceClient,
  negocio: Negocio,
  tipo: TipoAccion,
  nivel: Nivel
): Promise<string> {
  switch (tipo) {
    case 'consultar_resumen':
      return consultarResumen(supabase, negocio, nivel)
    case 'consultar_flujo':
      return consultarFlujo(supabase, negocio, nivel)
    case 'consultar_deudas':
      return consultarDeudas(supabase, negocio, nivel)
    case 'consultar_inventario':
      return consultarInventario(supabase, negocio, nivel)
    case 'consultar_salud':
      return consultarSalud(supabase, negocio, nivel)
    case 'consultar_pedido':
      return consultarPedido(supabase, negocio)
    default:
      return 'Puedo ayudarte con ventas, gastos, inventario, deudas y salud financiera.'
  }
}

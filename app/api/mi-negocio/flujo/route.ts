import { NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import {
  costoDeVenta,
  diagnosticarFlujo,
  resumenFinanciero,
  type VentaConCosto,
} from '@/lib/finanzas'
import {
  fechaLima,
  inicioPeriodoActual,
  limaStartMs,
  periodoFlujoValido,
} from '@/lib/fechas-lima'
import type { MedioPago, PeriodoFlujo } from '@/types'

// Días promedio de un mes, para prorratear gastos fijos mensuales a su parte semanal.
const DIAS_MES = 30
const BUCKETS_POR_PERIODO: Record<PeriodoFlujo, number> = {
  dia: 14,
  semana: 8,
  mes: 6,
}
const ETIQUETA_PERIODO: Record<PeriodoFlujo, string> = {
  dia: 'hoy',
  semana: 'esta semana',
  mes: 'este mes',
}
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Los gastos fijos mensuales (alquiler, luz) se registran una sola vez con el
// sufijo "(fijo)" en la descripción. No deben caer enteros en la semana en que
// se registraron: se prorratean a su parte semanal (ver más abajo).
const esGastoFijo = (descripcion?: string | null) =>
  (descripcion ?? '').toLowerCase().includes('(fijo)')

type BucketFlujo = {
  label: string
  inicio: number
  fin: number
  ventas: number
  efectivo: number
  yape: number
  plin: number
  tarjeta: number
  costoMercaderia: number
  gastosVariables: number
}

function sumarPeriodo(ms: number, periodo: PeriodoFlujo, cantidad: number): number {
  const d = fechaLima(ms)
  if (periodo === 'dia') return limaStartMs(d.year, d.month, d.date + cantidad)
  if (periodo === 'semana') return limaStartMs(d.year, d.month, d.date + cantidad * 7)
  return limaStartMs(d.year, d.month + cantidad, 1)
}

function etiquetaBucket(ms: number, periodo: PeriodoFlujo): string {
  const d = fechaLima(ms)
  if (periodo === 'mes') return MESES_CORTOS[d.month]
  return `${d.date}/${d.month + 1}`
}

function gastoFijoDelPeriodo(gastoFijoMensual: number, periodo: PeriodoFlujo): number {
  if (periodo === 'dia') return gastoFijoMensual / DIAS_MES
  if (periodo === 'semana') return (gastoFijoMensual * 7) / DIAS_MES
  return gastoFijoMensual
}

function construirBuckets(periodo: PeriodoFlujo): BucketFlujo[] {
  const cantidad = BUCKETS_POR_PERIODO[periodo]
  const inicioActual = inicioPeriodoActual(periodo)

  return Array.from({ length: cantidad }, (_, i) => {
    const inicio = sumarPeriodo(inicioActual, periodo, i - cantidad + 1)
    const fin = sumarPeriodo(inicio, periodo, 1)
    return {
      label: etiquetaBucket(inicio, periodo),
      inicio,
      fin,
      ventas: 0,
      efectivo: 0,
      yape: 0,
      plin: 0,
      tarjeta: 0,
      costoMercaderia: 0,
      // Gastos variables / puntuales del bucket. Los gastos fijos se prorratean abajo.
      gastosVariables: 0,
    }
  })
}

const r2 = (n: number) => Math.round(n * 100) / 100

export async function GET(request: Request) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const periodo = periodoFlujoValido(new URL(request.url).searchParams.get('periodo'))
    const buckets = construirBuckets(periodo)
    const desde = new Date(buckets[0]?.inicio ?? inicioPeriodoActual(periodo)).toISOString()

    const [{ data: ventas }, { data: gastos }, { data: gastosFijosCfg }] = await Promise.all([
      supabase
        .from('ventas')
        .select(
          'total, creado_en, medio_pago, items_venta(cantidad, precio_unit, productos(precio_compra))'
        )
        .eq('negocio_id', negocio.id)
        .gte('creado_en', desde),
      supabase
        .from('gastos')
        .select('monto, creado_en, descripcion')
        .eq('negocio_id', negocio.id)
        .gte('creado_en', desde),
      supabase
        .from('gastos_fijos')
        .select('monto')
        .eq('negocio_id', negocio.id)
        .eq('activo', true),
    ])

    const ventasArr = (ventas ?? []) as (VentaConCosto & {
      total: number
      creado_en: string
      medio_pago?: MedioPago | null
    })[]
    const gastosArr = (gastos ?? []) as {
      monto: number
      creado_en: string
      descripcion?: string | null
    }[]
    const gastosFijosArr = (gastosFijosCfg ?? []) as { monto: number }[]

    // Compromiso mensual de gastos fijos (alquiler, luz, sueldos...) y su parte
    // del periodo seleccionado para que el alquiler no caiga entero en un solo dia.
    const gastoFijoMensual = gastosFijosArr.reduce((s, g) => s + Number(g.monto), 0)
    const gastoFijoPeriodo = gastoFijoDelPeriodo(gastoFijoMensual, periodo)

    const bucketDe = (fechaISO: string) => {
      const t = new Date(fechaISO).getTime()
      return buckets.find((bk) => t >= bk.inicio && t < bk.fin)
    }

    for (const v of ventasArr) {
      const b = bucketDe(v.creado_en)
      if (b) {
        const totalVenta = Number(v.total)
        const medio = v.medio_pago ?? 'efectivo'
        b.ventas += totalVenta
        if (medio === 'yape' || medio === 'plin' || medio === 'tarjeta' || medio === 'efectivo') {
          b[medio] += totalVenta
        }
        b.costoMercaderia += costoDeVenta(v)
      }
    }
    // Solo los gastos variables / puntuales caen en el periodo en que se hicieron.
    // Los gastos fijos mensuales ("(fijo)") se prorratean mas abajo.
    for (const g of gastosArr) {
      if (esGastoFijo(g.descripcion)) continue
      const b = bucketDe(g.creado_en)
      if (b) b.gastosVariables += Number(g.monto)
    }

    const serie = buckets.map((b) => {
      const bruta = b.ventas - b.costoMercaderia
      const gastosPeriodo = gastoFijoPeriodo + b.gastosVariables
      const neta = bruta - gastosPeriodo
      return {
        semana: b.label,
        ventas: r2(b.ventas),
        efectivo: r2(b.efectivo),
        yape: r2(b.yape),
        plin: r2(b.plin),
        tarjeta: r2(b.tarjeta),
        costoMercaderia: r2(b.costoMercaderia),
        gananciaBruta: r2(bruta),
        gastosFijos: r2(gastosPeriodo),
        gananciaNeta: r2(neta),
        // Total de salidas del periodo (para el grafico Ventas vs Gastos).
        gastos: r2(b.costoMercaderia + gastosPeriodo),
      }
    })

    const periodoActual = serie[serie.length - 1]
    const periodoAnterior = serie[serie.length - 2]

    const resumen = resumenFinanciero({
      totalVentas: periodoActual?.ventas ?? 0,
      costoMercaderia: periodoActual?.costoMercaderia ?? 0,
      gastosFijos: periodoActual?.gastosFijos ?? 0,
    })

    const comparacion = {
      ventas: periodoActual?.ventas ?? 0,
      gastos: periodoActual?.gastos ?? 0,
      ganancia: periodoActual?.gananciaNeta ?? 0,
      gananciaAnterior: periodoAnterior?.gananciaNeta ?? 0,
      delta: r2((periodoActual?.gananciaNeta ?? 0) - (periodoAnterior?.gananciaNeta ?? 0)),
    }

    return NextResponse.json({
      periodo,
      etiquetaPeriodo: ETIQUETA_PERIODO[periodo],
      serie,
      totalVentas: r2(resumen.ventas),
      costoMercaderia: r2(resumen.costoMercaderia),
      gananciaBruta: r2(resumen.gananciaBruta),
      gastosFijos: r2(resumen.gastosFijos),
      gananciaNeta: r2(resumen.gananciaNeta),
      diagnostico: diagnosticarFlujo(resumen),
      tieneGastosFijos: gastosFijosArr.length > 0 || (periodoActual?.gastosFijos ?? 0) > 0,
      gastoFijoMensual: r2(gastoFijoMensual),
      gastoFijoSemanal: r2(gastoFijoPeriodo),
      comparacion,
      // Compatibilidad con clientes anteriores.
      totalGastos: r2(resumen.costoMercaderia + resumen.gastosFijos),
      totalCosto: r2(resumen.costoMercaderia),
      totalGastosRegistrados: r2(resumen.gastosFijos),
      porMedioPago: {
        efectivo: r2(periodoActual?.efectivo ?? 0),
        yape: r2(periodoActual?.yape ?? 0),
        plin: r2(periodoActual?.plin ?? 0),
        tarjeta: r2(periodoActual?.tarjeta ?? 0),
      },
    })
  } catch (err) {
    console.error('[GET /api/mi-negocio/flujo]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

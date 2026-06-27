import { NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import {
  costoDeVenta,
  diagnosticarFlujo,
  resumenFinanciero,
  type VentaConCosto,
} from '@/lib/finanzas'
import type { MedioPago } from '@/types'

const SEMANAS = 8
const MS_SEMANA = 7 * 24 * 60 * 60 * 1000
// Días promedio de un mes, para prorratear gastos fijos mensuales a su parte semanal.
const DIAS_MES = 30

// Los gastos fijos mensuales (alquiler, luz) se registran una sola vez con el
// sufijo "(fijo)" en la descripción. No deben caer enteros en la semana en que
// se registraron: se prorratean a su parte semanal (ver más abajo).
const esGastoFijo = (descripcion?: string | null) =>
  (descripcion ?? '').toLowerCase().includes('(fijo)')

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const desde = new Date(Date.now() - SEMANAS * MS_SEMANA).toISOString()

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

    // Compromiso mensual de gastos fijos (alquiler, luz, sueldos…) y su parte
    // semanal. Mostramos la parte semanal en lugar del golpe mensual completo
    // para no asustar al dueño: el alquiler del mes no "salió" todo en una semana.
    const gastoFijoMensual = gastosFijosArr.reduce((s, g) => s + Number(g.monto), 0)
    const gastoFijoSemanal = (gastoFijoMensual * 7) / DIAS_MES

    // Buckets semanales terminando en la semana actual.
    const ahora = Date.now()
    const buckets = Array.from({ length: SEMANAS }, (_, i) => {
      const finBucket = ahora - (SEMANAS - 1 - i) * MS_SEMANA
      const inicioBucket = finBucket - MS_SEMANA
      const d = new Date(finBucket)
      return {
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        inicio: inicioBucket,
        fin: finBucket,
        ventas: 0,
        efectivo: 0,
        yape: 0,
        plin: 0,
        tarjeta: 0,
        costoMercaderia: 0,
        // Gastos variables / puntuales de esa semana (compras, arreglos).
        // Los gastos fijos NO se bucketean aquí: se prorratean (ver serie).
        gastosVariables: 0,
      }
    })

    const bucketDe = (fechaISO: string) => {
      const t = new Date(fechaISO).getTime()
      return buckets.find((bk) => t > bk.inicio && t <= bk.fin)
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
    // Solo los gastos variables / puntuales caen en la semana en que se hicieron.
    // Los gastos fijos mensuales ("(fijo)") se prorratean por semana más abajo,
    // para que el alquiler del mes no aparezca como una pérdida de una sola semana.
    for (const g of gastosArr) {
      if (esGastoFijo(g.descripcion)) continue
      const b = bucketDe(g.creado_en)
      if (b) b.gastosVariables += Number(g.monto)
    }

    const r2 = (n: number) => Math.round(n * 100) / 100

    const serie = buckets.map((b) => {
      const bruta = b.ventas - b.costoMercaderia
      // Gastos de la semana = parte semanal de los fijos del mes + gastos puntuales.
      const gastosSemana = gastoFijoSemanal + b.gastosVariables
      const neta = bruta - gastosSemana
      return {
        semana: b.label,
        ventas: r2(b.ventas),
        efectivo: r2(b.efectivo),
        yape: r2(b.yape),
        plin: r2(b.plin),
        tarjeta: r2(b.tarjeta),
        costoMercaderia: r2(b.costoMercaderia),
        gananciaBruta: r2(bruta),
        gastosFijos: r2(gastosSemana),
        gananciaNeta: r2(neta),
        // Total de salidas de la semana (para el gráfico Ventas vs Gastos).
        gastos: r2(b.costoMercaderia + gastosSemana),
      }
    })

    const totalVentas = ventasArr.reduce((s, v) => s + Number(v.total), 0)
    const porMedioPago = ventasArr.reduce<Record<MedioPago, number>>(
      (acc, v) => {
        const medio = v.medio_pago ?? 'efectivo'
        if (medio === 'yape' || medio === 'plin' || medio === 'tarjeta' || medio === 'efectivo') {
          acc[medio] += Number(v.total)
        }
        return acc
      },
      { efectivo: 0, yape: 0, plin: 0, tarjeta: 0 }
    )
    const totalCosto = ventasArr.reduce((s, v) => s + costoDeVenta(v), 0)
    // Gastos del periodo = fijos prorrateados a lo largo de la ventana + gastos puntuales.
    const totalGastosVariables = gastosArr
      .filter((g) => !esGastoFijo(g.descripcion))
      .reduce((s, g) => s + Number(g.monto), 0)
    const totalGastosFijos = gastoFijoSemanal * SEMANAS + totalGastosVariables

    const resumen = resumenFinanciero({
      totalVentas,
      costoMercaderia: totalCosto,
      gastosFijos: totalGastosFijos,
    })

    // Comparación de la última semana cerrada vs la anterior (para niveles 1-2).
    const semActual = serie[serie.length - 1]
    const semAnterior = serie[serie.length - 2]
    const comparacion = {
      ventas: semActual?.ventas ?? 0,
      gastos: semActual?.gastos ?? 0,
      ganancia: semActual?.gananciaNeta ?? 0,
      gananciaAnterior: semAnterior?.gananciaNeta ?? 0,
      delta: r2((semActual?.gananciaNeta ?? 0) - (semAnterior?.gananciaNeta ?? 0)),
    }

    return NextResponse.json({
      serie,
      totalVentas: r2(resumen.ventas),
      costoMercaderia: r2(resumen.costoMercaderia),
      gananciaBruta: r2(resumen.gananciaBruta),
      gastosFijos: r2(resumen.gastosFijos),
      gananciaNeta: r2(resumen.gananciaNeta),
      diagnostico: diagnosticarFlujo(resumen),
      tieneGastosFijos: (gastosFijosArr.length ?? 0) > 0 || totalGastosVariables > 0,
      gastoFijoMensual: r2(gastoFijoMensual),
      gastoFijoSemanal: r2(gastoFijoSemanal),
      comparacion,
      // Compatibilidad con clientes anteriores.
      totalGastos: r2(resumen.costoMercaderia + resumen.gastosFijos),
      totalCosto: r2(resumen.costoMercaderia),
      totalGastosRegistrados: r2(resumen.gastosFijos),
      porMedioPago: {
        efectivo: r2(porMedioPago.efectivo),
        yape: r2(porMedioPago.yape),
        plin: r2(porMedioPago.plin),
        tarjeta: r2(porMedioPago.tarjeta),
      },
    })
  } catch (err) {
    console.error('[GET /api/mi-negocio/flujo]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

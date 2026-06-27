import { NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import {
  costoDeVenta,
  diagnosticarFlujo,
  resumenFinanciero,
  type VentaConCosto,
} from '@/lib/finanzas'

const SEMANAS = 8
const MS_SEMANA = 7 * 24 * 60 * 60 * 1000

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
          'total, creado_en, items_venta(cantidad, precio_unit, productos(precio_compra))'
        )
        .eq('negocio_id', negocio.id)
        .gte('creado_en', desde),
      supabase
        .from('gastos')
        .select('monto, creado_en')
        .eq('negocio_id', negocio.id)
        .gte('creado_en', desde),
      supabase
        .from('gastos_fijos')
        .select('id')
        .eq('negocio_id', negocio.id)
        .eq('activo', true)
        .limit(1),
    ])

    const ventasArr = (ventas ?? []) as (VentaConCosto & { total: number; creado_en: string })[]
    const gastosArr = (gastos ?? []) as { monto: number; creado_en: string }[]

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
        costoMercaderia: 0,
        gastosFijos: 0,
      }
    })

    const bucketDe = (fechaISO: string) => {
      const t = new Date(fechaISO).getTime()
      return buckets.find((bk) => t > bk.inicio && t <= bk.fin)
    }

    for (const v of ventasArr) {
      const b = bucketDe(v.creado_en)
      if (b) {
        b.ventas += Number(v.total)
        b.costoMercaderia += costoDeVenta(v)
      }
    }
    // Los gastos registrados (alquiler, luz, etc.) son los gastos fijos del periodo.
    // No se vuelve a sumar la tabla gastos_fijos para evitar doble conteo: el
    // onboarding ya inserta cada gasto fijo como una fila en `gastos`.
    for (const g of gastosArr) {
      const b = bucketDe(g.creado_en)
      if (b) b.gastosFijos += Number(g.monto)
    }

    const r2 = (n: number) => Math.round(n * 100) / 100

    const serie = buckets.map((b) => {
      const bruta = b.ventas - b.costoMercaderia
      const neta = bruta - b.gastosFijos
      return {
        semana: b.label,
        ventas: r2(b.ventas),
        costoMercaderia: r2(b.costoMercaderia),
        gananciaBruta: r2(bruta),
        gastosFijos: r2(b.gastosFijos),
        gananciaNeta: r2(neta),
        // Total de salidas de la semana (para el gráfico Ventas vs Gastos).
        gastos: r2(b.costoMercaderia + b.gastosFijos),
      }
    })

    const totalVentas = ventasArr.reduce((s, v) => s + Number(v.total), 0)
    const totalCosto = ventasArr.reduce((s, v) => s + costoDeVenta(v), 0)
    const totalGastosFijos = gastosArr.reduce((s, g) => s + Number(g.monto), 0)

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
      tieneGastosFijos: (gastosFijosCfg?.length ?? 0) > 0 || totalGastosFijos > 0,
      comparacion,
      // Compatibilidad con clientes anteriores.
      totalGastos: r2(resumen.costoMercaderia + resumen.gastosFijos),
      totalCosto: r2(resumen.costoMercaderia),
      totalGastosRegistrados: r2(resumen.gastosFijos),
    })
  } catch (err) {
    console.error('[GET /api/mi-negocio/flujo]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

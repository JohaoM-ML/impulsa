import { NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'

const SEMANAS = 8
const MS_SEMANA = 7 * 24 * 60 * 60 * 1000

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const desde = new Date(Date.now() - SEMANAS * MS_SEMANA).toISOString()

    const [{ data: ventas }, { data: gastos }] = await Promise.all([
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
    ])

    // Costo de la mercadería vendida (COGS) por venta: lo que costó cada producto.
    // Si no hay precio_compra, se estima en 65% del precio de venta.
    const costoDeVenta = (venta: {
      items_venta?: Array<{
        cantidad: number
        precio_unit: number
        productos: { precio_compra: number | null } | { precio_compra: number | null }[] | null
      }>
    }): number => {
      const items = venta.items_venta ?? []
      return items.reduce((s, it) => {
        const prod = Array.isArray(it.productos) ? it.productos[0] : it.productos
        const precioVenta = Number(it.precio_unit)
        const costo =
          prod?.precio_compra != null ? Number(prod.precio_compra) : precioVenta * 0.65
        return s + costo * Number(it.cantidad)
      }, 0)
    }

    // Construye SEMANAS buckets terminando en la semana actual.
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
        gastos: 0,
      }
    })

    const asignar = (fechaISO: string, monto: number, campo: 'ventas' | 'gastos') => {
      const t = new Date(fechaISO).getTime()
      const b = buckets.find((bk) => t > bk.inicio && t <= bk.fin)
      if (b) b[campo] += monto
    }

    for (const v of ventas ?? []) {
      asignar(v.creado_en, Number(v.total), 'ventas')
      // El costo de la mercadería vendida cuenta como gasto en el flujo.
      asignar(v.creado_en, costoDeVenta(v), 'gastos')
    }
    for (const g of gastos ?? []) asignar(g.creado_en, Number(g.monto), 'gastos')

    const serie = buckets.map((b) => ({
      semana: b.label,
      ventas: Math.round(b.ventas * 100) / 100,
      gastos: Math.round(b.gastos * 100) / 100,
    }))

    const totalVentas = (ventas ?? []).reduce((s, v) => s + Number(v.total), 0)
    const totalCosto = (ventas ?? []).reduce((s, v) => s + costoDeVenta(v), 0)
    const totalGastosReg = (gastos ?? []).reduce((s, g) => s + Number(g.monto), 0)
    const totalGastos = totalCosto + totalGastosReg

    return NextResponse.json({
      serie,
      totalVentas: Math.round(totalVentas * 100) / 100,
      totalGastos: Math.round(totalGastos * 100) / 100,
      totalCosto: Math.round(totalCosto * 100) / 100,
      totalGastosRegistrados: Math.round(totalGastosReg * 100) / 100,
    })
  } catch (err) {
    console.error('[GET /api/mi-negocio/flujo]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

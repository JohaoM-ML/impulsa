import { NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const [{ data: items }, { data: productos }] = await Promise.all([
      // Items de venta del negocio (filtro vía relación con ventas).
      supabase
        .from('items_venta')
        .select('nombre_item, cantidad, subtotal, ventas!inner(negocio_id)')
        .eq('ventas.negocio_id', negocio.id),
      supabase
        .from('productos')
        .select('nombre, precio_compra, precio_venta')
        .eq('negocio_id', negocio.id)
        .eq('activo', true),
    ])

    // Más vendidos por ingresos.
    const acumulado = new Map<string, { ingresos: number; cantidad: number }>()
    for (const it of items ?? []) {
      const prev = acumulado.get(it.nombre_item) ?? { ingresos: 0, cantidad: 0 }
      prev.ingresos += Number(it.subtotal)
      prev.cantidad += Number(it.cantidad)
      acumulado.set(it.nombre_item, prev)
    }
    const masVendidos = Array.from(acumulado.entries())
      .map(([nombre, v]) => ({ nombre, ingresos: Math.round(v.ingresos * 100) / 100, cantidad: v.cantidad }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10)

    // Más rentables por margen.
    const masRentables = (productos ?? [])
      .filter((p) => Number(p.precio_venta) > 0 && p.precio_compra != null)
      .map((p) => {
        const venta = Number(p.precio_venta)
        const compra = Number(p.precio_compra)
        const margen = venta > 0 ? Math.round(((venta - compra) / venta) * 100) : 0
        return { nombre: p.nombre, margen }
      })
      .filter((p) => p.margen > 0)
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 8)

    return NextResponse.json({ masVendidos, masRentables })
  } catch (err) {
    console.error('[GET /api/mi-negocio/top]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

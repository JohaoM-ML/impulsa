import { NextRequest, NextResponse } from 'next/server'
import { inicioPeriodo, normalizarNombre, sugerenciaPedido } from '@/lib/abastecimiento'
import { getNegocioFromSession } from '@/lib/supabase/server'
import type { TopProductoItem, TopResumen } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const periodo = request.nextUrl.searchParams.get('periodo') ?? '30d'
    const desde = inicioPeriodo(periodo)

    let itemsQuery = supabase
      .from('items_venta')
      .select('nombre_item, cantidad, subtotal, producto_id, ventas!inner(negocio_id, creado_en)')
      .eq('ventas.negocio_id', negocio.id)

    if (desde) {
      itemsQuery = itemsQuery.gte('ventas.creado_en', desde)
    }

    const [{ data: items }, { data: productos }] = await Promise.all([
      itemsQuery,
      supabase
        .from('productos')
        .select('id, nombre, categoria, unidad, stock_actual, stock_minimo, precio_compra, precio_venta')
        .eq('negocio_id', negocio.id)
        .eq('activo', true),
    ])

    const productoPorId = new Map((productos ?? []).map((p) => [p.id, p]))
    const productoPorNombre = new Map(
      (productos ?? []).map((p) => [normalizarNombre(p.nombre), p])
    )

    const ventasPorClave = new Map<
      string,
      { nombre: string; productoId: string | null; cantidad: number; ingresos: number }
    >()

    for (const it of items ?? []) {
      const producto =
        (it.producto_id ? productoPorId.get(it.producto_id) : null) ??
        productoPorNombre.get(normalizarNombre(it.nombre_item))
      const clave = producto?.id ?? `nombre:${normalizarNombre(it.nombre_item)}`
      const nombre = producto?.nombre ?? it.nombre_item
      const prev = ventasPorClave.get(clave) ?? {
        nombre,
        productoId: producto?.id ?? it.producto_id ?? null,
        cantidad: 0,
        ingresos: 0,
      }
      prev.cantidad += Number(it.cantidad)
      prev.ingresos += Number(it.subtotal)
      ventasPorClave.set(clave, prev)
    }

    const buildItem = (
      entrada: { nombre: string; productoId: string | null; cantidad: number; ingresos: number }
    ): TopProductoItem => {
      const producto =
        (entrada.productoId ? productoPorId.get(entrada.productoId) : null) ??
        productoPorNombre.get(normalizarNombre(entrada.nombre))
      const stockActual = Number(producto?.stock_actual ?? 0)
      const stockMinimo = Number(producto?.stock_minimo ?? 5)
      const unidad = producto?.unidad ?? 'unidades'
      return {
        id: producto?.id ?? entrada.productoId,
        nombre: entrada.nombre,
        cantidad: Math.round(entrada.cantidad * 100) / 100,
        ingresos: Math.round(entrada.ingresos * 100) / 100,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        unidad,
        categoria: producto?.categoria ?? null,
        sugerencia_pedido: sugerenciaPedido(stockActual, stockMinimo, entrada.cantidad),
        stock_bajo: stockActual <= stockMinimo,
      }
    }

    const conVentas = Array.from(ventasPorClave.values()).map(buildItem)

    const porCantidad = [...conVentas].sort((a, b) => b.cantidad - a.cantidad).slice(0, 20)
    const porIngresos = [...conVentas].sort((a, b) => b.ingresos - a.ingresos).slice(0, 20)

    const nombresConVenta = new Set(
      conVentas.map((p) => (p.id ? p.id : `nombre:${normalizarNombre(p.nombre)}`))
    )

    const sinVentas: TopProductoItem[] = (productos ?? [])
      .filter((p) => !nombresConVenta.has(p.id))
      .map((p) =>
        buildItem({
          nombre: p.nombre,
          productoId: p.id,
          cantidad: 0,
          ingresos: 0,
        })
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

    const categorias = Array.from(
      new Set((productos ?? []).map((p) => p.categoria).filter((c): c is string => Boolean(c)))
    ).sort((a, b) => a.localeCompare(b, 'es'))

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

    const respuesta: TopResumen = {
      porCantidad,
      porIngresos,
      sinVentas,
      masRentables,
      categorias,
      periodo,
    }

    return NextResponse.json(respuesta)
  } catch (err) {
    console.error('[GET /api/mi-negocio/top]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

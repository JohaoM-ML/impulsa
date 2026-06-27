import { NextRequest, NextResponse } from 'next/server'
import {
  costoEstimado,
  inicioPeriodo,
  normalizarNombre,
  sugerenciaPedido,
} from '@/lib/abastecimiento'
import { getNegocioFromSession } from '@/lib/supabase/server'
import type { AbastecimientoItem, AbastecimientoResumen } from '@/types'

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
      .select('nombre_item, cantidad, producto_id, ventas!inner(negocio_id, creado_en)')
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

    const ventasPorProducto = new Map<string, number>()

    for (const it of items ?? []) {
      const clave = it.producto_id ?? `nombre:${normalizarNombre(it.nombre_item)}`
      ventasPorProducto.set(clave, (ventasPorProducto.get(clave) ?? 0) + Number(it.cantidad))
    }

    const lista: AbastecimientoItem[] = (productos ?? []).map((p) => {
      const vendido =
        ventasPorProducto.get(p.id) ??
        ventasPorProducto.get(`nombre:${normalizarNombre(p.nombre)}`) ??
        0
      const stockActual = Number(p.stock_actual)
      const stockMinimo = Number(p.stock_minimo)
      const sugerencia = sugerenciaPedido(stockActual, stockMinimo, vendido)
      const stockBajo = stockActual <= stockMinimo

      return {
        id: p.id,
        nombre: p.nombre,
        unidad: p.unidad,
        categoria: p.categoria ?? null,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        vendido_periodo: Math.round(vendido * 100) / 100,
        sugerencia_pedido: sugerencia,
        costo_estimado: costoEstimado(sugerencia, p.precio_compra, p.precio_venta),
        stock_bajo: stockBajo,
      }
    })

    const productosPrioritarios = lista
      .filter((p) => p.stock_bajo || p.sugerencia_pedido > 0)
      .sort((a, b) => {
        if (a.stock_bajo !== b.stock_bajo) return a.stock_bajo ? -1 : 1
        if (b.sugerencia_pedido !== a.sugerencia_pedido) return b.sugerencia_pedido - a.sugerencia_pedido
        return b.vendido_periodo - a.vendido_periodo
      })

    const respuesta: AbastecimientoResumen = {
      periodo,
      productos_stock_bajo: lista.filter((p) => p.stock_bajo).length,
      productos_a_reabastecer: productosPrioritarios.length,
      unidades_sugeridas: productosPrioritarios.reduce((s, p) => s + p.sugerencia_pedido, 0),
      costo_estimado_total: Math.round(
        productosPrioritarios.reduce((s, p) => s + p.costo_estimado, 0) * 100
      ) / 100,
      productos: productosPrioritarios,
    }

    return NextResponse.json(respuesta)
  } catch (err) {
    console.error('[GET /api/mi-negocio/abastecimiento]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

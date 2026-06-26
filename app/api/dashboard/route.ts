import { NextResponse } from 'next/server'
import { finDiaLocal, inicioDiaLocal } from '@/lib/utils'
import { getNegocioFromSession } from '@/lib/supabase/server'
import type { DashboardResumen } from '@/types'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const inicio = inicioDiaLocal()
    const fin = finDiaLocal()

    const [
      { data: ventasHoyDetalle },
      { data: gastosHoy },
      { data: productos },
      { data: ventasSemana },
      { data: scores },
      { data: clientes },
    ] = await Promise.all([
      supabase
        .from('ventas')
        .select(
          'total, items_venta(nombre_item, cantidad, precio_unit, producto_id, productos(precio_compra))'
        )
        .eq('negocio_id', negocio.id)
        .gte('creado_en', inicio)
        .lte('creado_en', fin),
      supabase
        .from('gastos')
        .select('monto')
        .eq('negocio_id', negocio.id)
        .gte('creado_en', inicio)
        .lte('creado_en', fin),
      supabase
        .from('productos')
        .select('stock_actual, stock_minimo')
        .eq('negocio_id', negocio.id)
        .eq('activo', true),
      supabase
        .from('ventas')
        .select('total, creado_en')
        .eq('negocio_id', negocio.id)
        .gte('creado_en', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('pym_scores')
        .select('score, explicacion, semana')
        .eq('negocio_id', negocio.id)
        .order('semana', { ascending: false })
        .limit(2),
      supabase
        .from('clientes')
        .select('deuda_total')
        .eq('negocio_id', negocio.id)
        .gt('deuda_total', 0),
    ])

    const totalVentasHoy = (ventasHoyDetalle ?? []).reduce((s, v) => s + Number(v.total), 0)
    const gastoHoy = (gastosHoy ?? []).reduce((s, g) => s + Number(g.monto), 0)

    let gananciasHoy = 0
    const rotacion: Record<string, number> = {}

    for (const venta of ventasHoyDetalle ?? []) {
      const items = (venta.items_venta ?? []) as Array<{
        nombre_item: string
        cantidad: number
        precio_unit: number
        producto_id: string | null
        productos: { precio_compra: number | null } | { precio_compra: number | null }[] | null
      }>
      for (const it of items) {
        const cantidad = Number(it.cantidad)
        const precioVenta = Number(it.precio_unit)
        const prodRaw = it.productos
        const prod = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw
        const costo =
          prod?.precio_compra != null
            ? Number(prod.precio_compra)
            : precioVenta * 0.65
        gananciasHoy += (precioVenta - costo) * cantidad

        const nombre = it.nombre_item.trim()
        rotacion[nombre] = (rotacion[nombre] ?? 0) + cantidad
      }
    }

    let productoTopHoy: { nombre: string; cantidad: number } | null = null
    for (const [nombre, cantidad] of Object.entries(rotacion)) {
      if (!productoTopHoy || cantidad > productoTopHoy.cantidad) {
        productoTopHoy = { nombre, cantidad }
      }
    }
    const stockBajo = (productos ?? []).filter(
      (p) => Number(p.stock_actual) <= Number(p.stock_minimo)
    ).length

    const score = scores?.[0]?.score ?? null
    const scoreDelta = scores && scores.length >= 2 ? (scores[0].score - scores[1].score) : 0
    const scoreExplicacion = scores?.[0]?.explicacion ?? null

    const fiados = clientes ?? []
    const fiadosTotal = fiados.reduce((s, c) => s + Number(c.deuda_total), 0)

    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const mapaSemana: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      mapaSemana[d.toISOString().split('T')[0]] = 0
    }

    for (const v of ventasSemana ?? []) {
      const key = v.creado_en.split('T')[0]
      if (key in mapaSemana) {
        mapaSemana[key] += Number(v.total)
      }
    }

    const ventasSemanaArr = Object.entries(mapaSemana).map(([fecha, total]) => ({
      dia: dias[new Date(fecha + 'T12:00:00').getDay()],
      total,
    }))

    const resumen: DashboardResumen = {
      gananciaHoy: totalVentasHoy,
      ventasHoy: ventasHoyDetalle?.length ?? 0,
      totalVentasHoy,
      gananciasHoy: Math.round(gananciasHoy * 100) / 100,
      gastoHoy,
      teQueda: totalVentasHoy - gastoHoy,
      movimientosHoy: (ventasHoyDetalle?.length ?? 0) + (gastosHoy?.length ?? 0),
      productoTopHoy,
      stockBajo,
      score,
      scoreDelta,
      scoreExplicacion,
      fiadosCount: fiados.length,
      fiadosTotal,
      ventasSemana: ventasSemanaArr,
    }

    return NextResponse.json(resumen)
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

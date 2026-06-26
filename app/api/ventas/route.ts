import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { recalcularScore } from '@/lib/pym-score-server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { data: ventas, error: ventasError } = await supabase
      .from('ventas')
      .select('*, items_venta(*)')
      .eq('negocio_id', negocio.id)
      .order('creado_en', { ascending: false })
      .limit(50)

    if (ventasError) throw ventasError

    return NextResponse.json(ventas ?? [])
  } catch (err) {
    console.error('[GET /api/ventas]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const body = await request.json()
    const items = body.items as Array<{
      nombre_item: string
      cantidad: number
      precio_unit: number
      producto_id?: string | null
    }>

    if (!items?.length) {
      return NextResponse.json({ error: 'Agrega al menos un producto' }, { status: 400 })
    }

    const total = items.reduce((s, i) => s + i.cantidad * i.precio_unit, 0)

    const itemsPayload = items.map((i) => ({
      producto_id: i.producto_id ?? null,
      nombre_item: i.nombre_item,
      cantidad: i.cantidad,
      precio_unit: i.precio_unit,
    }))

    // Venta + items + descuento de stock en una sola transacción atómica (ver RPC).
    const { data: venta, error: ventaError } = await supabase
      .rpc('registrar_venta', {
        p_negocio_id: negocio.id,
        p_total: total,
        p_items: itemsPayload,
        p_cliente_id: body.cliente_id ?? null,
        p_notas: body.notas ?? null,
      })
      .single()

    if (ventaError) throw ventaError

    const ventaRow = venta as Record<string, unknown> & { id: string }

    const itemsVenta = items.map((i) => ({
      venta_id: ventaRow.id,
      producto_id: i.producto_id ?? null,
      nombre_item: i.nombre_item,
      cantidad: i.cantidad,
      precio_unit: i.precio_unit,
      subtotal: i.cantidad * i.precio_unit,
    }))

    // Mantiene el PymScore al día tras cada venta (sin regenerar la explicación de Claude).
    try {
      await recalcularScore(supabase, negocio)
    } catch (scoreErr) {
      console.error('[POST /api/ventas] recalcularScore', scoreErr)
    }

    return NextResponse.json({ ...ventaRow, items_venta: itemsVenta }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/ventas]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

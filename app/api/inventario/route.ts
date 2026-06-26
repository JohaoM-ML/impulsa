import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { data, error: dbError } = await supabase
      .from('productos')
      .select('*')
      .eq('negocio_id', negocio.id)
      .eq('activo', true)
      .order('nombre')

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[GET /api/inventario]', err)
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
    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('productos')
      .insert({
        negocio_id: negocio.id,
        nombre: body.nombre.trim(),
        unidad: body.unidad ?? 'unidades',
        stock_actual: body.stock_actual ?? 0,
        stock_minimo: body.stock_minimo ?? 5,
        precio_compra: body.precio_compra ?? null,
        precio_venta: body.precio_venta ?? null,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/inventario]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

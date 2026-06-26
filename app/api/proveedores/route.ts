import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { data, error: dbError } = await supabase
      .from('proveedores')
      .select('*')
      .eq('negocio_id', negocio.id)
      .order('nombre')

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[GET /api/proveedores]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { nombre, telefono, deuda_total } = await request.json()
    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('proveedores')
      .insert({
        negocio_id: negocio.id,
        nombre: nombre.trim(),
        telefono: telefono ?? null,
        deuda_total: Number(deuda_total) || 0,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/proveedores]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { id, deuda_total } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('proveedores')
      .update({ deuda_total: Number(deuda_total) || 0 })
      .eq('id', id)
      .eq('negocio_id', negocio.id)
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/proveedores]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

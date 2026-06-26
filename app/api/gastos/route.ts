import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { data, error: dbError } = await supabase
      .from('gastos')
      .select('*')
      .eq('negocio_id', negocio.id)
      .order('creado_en', { ascending: false })
      .limit(50)

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[GET /api/gastos]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { descripcion, monto, categoria } = await request.json()
    if (!descripcion?.trim() || !monto) {
      return NextResponse.json({ error: 'Descripción y monto requeridos' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('gastos')
      .insert({
        negocio_id: negocio.id,
        descripcion: descripcion.trim(),
        monto: Number(monto),
        categoria: categoria ?? null,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/gastos]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

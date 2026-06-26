import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }
    return NextResponse.json(negocio)
  } catch (err) {
    console.error('[GET /api/negocio]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, negocio, error } = await getNegocioFromSession()
    if (error === 'No autorizado' || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (negocio) {
      return NextResponse.json(negocio)
    }

    const { nombre, rubro } = await request.json()
    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre del negocio requerido' }, { status: 400 })
    }

    const { data: nuevoNegocio, error: negocioError } = await supabase
      .from('negocios')
      .insert({ user_id: user.id, nombre: nombre.trim(), rubro: rubro?.trim() || null })
      .select()
      .single()

    if (negocioError) throw negocioError

    const { error: progresoError } = await supabase.from('progreso_usuario').insert({
      user_id: user.id,
      negocio_id: nuevoNegocio.id,
      nivel: 1,
      xp_total: 0,
      onboarding_completado: false,
    })

    if (progresoError) throw progresoError

    return NextResponse.json(nuevoNegocio, { status: 201 })
  } catch (err) {
    console.error('[POST /api/negocio]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

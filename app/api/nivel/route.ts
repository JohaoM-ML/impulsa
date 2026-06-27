import { NextRequest, NextResponse } from 'next/server'
import { calcularNivel } from '@/lib/nivel'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: progreso, error } = await supabase
      .from('progreso_usuario')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !progreso) {
      return NextResponse.json({ error: 'Progreso no encontrado' }, { status: 404 })
    }

    const nivelCalculado = calcularNivel(progreso.xp_total)
    if (progreso.nivel !== nivelCalculado) {
      await supabase
        .from('progreso_usuario')
        .update({ nivel: nivelCalculado })
        .eq('user_id', user.id)
      progreso.nivel = nivelCalculado
    }

    return NextResponse.json(progreso)
  } catch (err) {
    console.error('[GET /api/nivel]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = (await request.json()) as { tutorial_visto?: boolean }
    if (body.tutorial_visto !== true) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    const { data: progreso, error } = await supabase
      .from('progreso_usuario')
      .update({ tutorial_visto: true })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(progreso)
  } catch (err) {
    console.error('[PATCH /api/nivel]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

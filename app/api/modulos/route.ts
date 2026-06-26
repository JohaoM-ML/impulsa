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

    const [{ data: modulos }, { data: progreso }, { data: completados }] = await Promise.all([
      supabase
        .from('modulos_educativos')
        .select('*')
        .eq('activo', true)
        .order('nivel_minimo', { ascending: true })
        .order('orden', { ascending: true }),
      supabase.from('progreso_usuario').select('nivel, xp_total').eq('user_id', user.id).single(),
      supabase.from('progreso_modulos').select('modulo_id, completado').eq('user_id', user.id),
    ])

    const nivel = progreso ? calcularNivel(progreso.xp_total) : 1
    const setCompletados = new Set(
      (completados ?? []).filter((c) => c.completado).map((c) => c.modulo_id)
    )

    const modulosOut = (modulos ?? []).map((m) => ({
      ...m,
      completado: setCompletados.has(m.id),
      bloqueado: nivel < (m.nivel_minimo ?? 1),
    }))

    return NextResponse.json({
      nivel,
      xp_total: progreso?.xp_total ?? 0,
      modulos: modulosOut,
      completadosCount: setCompletados.size,
    })
  } catch (err) {
    console.error('[GET /api/modulos]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { modulo_id } = await request.json()
    if (!modulo_id) {
      return NextResponse.json({ error: 'modulo_id requerido' }, { status: 400 })
    }

    const { data: modulo } = await supabase
      .from('modulos_educativos')
      .select('id, nivel_minimo, xp_recompensa')
      .eq('id', modulo_id)
      .eq('activo', true)
      .maybeSingle()

    if (!modulo) {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
    }

    const { data: progreso } = await supabase
      .from('progreso_usuario')
      .select('xp_total')
      .eq('user_id', user.id)
      .single()

    const nivelActual = calcularNivel(progreso?.xp_total ?? 0)
    if (nivelActual < (modulo.nivel_minimo ?? 1)) {
      return NextResponse.json({ error: 'Módulo bloqueado para tu nivel' }, { status: 403 })
    }

    // ¿Ya estaba completado? No volver a sumar XP.
    const { data: existente } = await supabase
      .from('progreso_modulos')
      .select('completado')
      .eq('user_id', user.id)
      .eq('modulo_id', modulo_id)
      .maybeSingle()

    const xpRecompensa = modulo.xp_recompensa ?? 10
    const yaCompletado = existente?.completado === true
    const xpGanado = yaCompletado ? 0 : xpRecompensa

    await supabase.from('progreso_modulos').upsert(
      {
        user_id: user.id,
        modulo_id,
        completado: true,
        completado_en: new Date().toISOString(),
        xp_ganado: xpRecompensa,
      },
      { onConflict: 'user_id,modulo_id' }
    )

    const nuevoXp = (progreso?.xp_total ?? 0) + xpGanado
    const nuevoNivel = calcularNivel(nuevoXp)

    const { data: progresoNuevo } = await supabase
      .from('progreso_usuario')
      .update({ xp_total: nuevoXp, nivel: nuevoNivel })
      .eq('user_id', user.id)
      .select()
      .single()

    return NextResponse.json({
      xp_ganado: xpGanado,
      xp_total: nuevoXp,
      nivel: nuevoNivel,
      progreso: progresoNuevo,
    })
  } catch (err) {
    console.error('[POST /api/modulos]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

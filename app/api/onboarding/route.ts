import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { categorizarNivel, type RespuestaAgente } from '@/lib/agente/categorizacion'
import type { OpcionOnboarding } from '@/types'

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

    const { data: preguntas, error } = await supabase
      .from('preguntas_onboarding')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })

    if (error) throw error

    return NextResponse.json(preguntas ?? [])
  } catch (err) {
    console.error('[GET /api/onboarding]', err)
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

    const { respuestas } = await request.json() as {
      respuestas: Array<{ pregunta_id: string; respuesta: string; xp_ganado: number }>
    }

    if (!respuestas?.length) {
      return NextResponse.json({ error: 'Respuestas requeridas' }, { status: 400 })
    }

    // Guarda las respuestas crudas.
    const inserts = respuestas.map((r) => ({
      user_id: user.id,
      pregunta_id: r.pregunta_id,
      respuesta: r.respuesta,
      xp_ganado: r.xp_ganado,
    }))

    const { error: respError } = await supabase.from('respuestas_onboarding').insert(inserts)
    if (respError) throw respError

    // Resuelve los textos de pregunta y opción para alimentar al agente Claude.
    const { data: preguntas } = await supabase
      .from('preguntas_onboarding')
      .select('id, pregunta, opciones')
      .in('id', respuestas.map((r) => r.pregunta_id))

    const mapaPregunta = new Map((preguntas ?? []).map((p) => [p.id, p]))
    const respuestasAgente: RespuestaAgente[] = respuestas.map((r) => {
      const p = mapaPregunta.get(r.pregunta_id)
      const opcion = ((p?.opciones as OpcionOnboarding[]) ?? []).find((o) => o.id === r.respuesta)
      return {
        pregunta: p?.pregunta ?? 'Pregunta',
        respuesta: opcion?.texto ?? r.respuesta,
        xp: r.xp_ganado || 0,
      }
    })

    // Negocio del usuario (rubro/nombre) para dar contexto al agente.
    const { data: negocio } = await supabase
      .from('negocios')
      .select('nombre, rubro')
      .eq('user_id', user.id)
      .order('creado_en', { ascending: true })
      .limit(1)
      .maybeSingle()

    const perfil = await categorizarNivel({
      rubro: negocio?.rubro ?? null,
      nombreNegocio: negocio?.nombre ?? null,
      respuestas: respuestasAgente,
    })

    // Upsert robusto: crea la fila si no existe (evita el error si faltaba progreso).
    const { data: progreso, error: progError } = await supabase
      .from('progreso_usuario')
      .upsert(
        {
          user_id: user.id,
          xp_total: perfil.xp,
          nivel: perfil.nivel,
          onboarding_completado: true,
          ultimo_acceso: new Date().toISOString().split('T')[0],
          perfil_ia: {
            explicacion: perfil.explicacion,
            recomendaciones: perfil.recomendaciones,
            fuente: perfil.fuente,
          },
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (progError) throw progError

    return NextResponse.json({
      progreso,
      xp_ganado: perfil.xp,
      nivel_nuevo: perfil.nivel,
      perfil_ia: {
        explicacion: perfil.explicacion,
        recomendaciones: perfil.recomendaciones,
        fuente: perfil.fuente,
      },
    })
  } catch (err) {
    console.error('[POST /api/onboarding]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { calcularNivel, umbralNivel } from '@/lib/nivel'
import type { Nivel } from '@/lib/vocabulario'

const PREGUNTAS_POR_EXAMEN = 5
const UMBRAL_APROBACION = 0.6
const XP_BONUS_APROBADO = 40

interface OpcionExamen {
  id: string
  texto: string
}

function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

async function nivelDelUsuario(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<{ nivel: Nivel; xp: number }> {
  const { data } = await supabase
    .from('progreso_usuario')
    .select('xp_total')
    .eq('user_id', userId)
    .maybeSingle()
  const xp = data?.xp_total ?? 0
  return { nivel: calcularNivel(xp), xp }
}

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

    const { nivel } = await nivelDelUsuario(supabase, user.id)

    const { data: preguntas, error } = await supabase
      .from('preguntas_examen')
      .select('id, pregunta, opciones')
      .eq('nivel', nivel)
      .eq('activo', true)
    if (error) throw error

    const seleccion = mezclar(preguntas ?? []).slice(0, PREGUNTAS_POR_EXAMEN)

    return NextResponse.json({
      nivel,
      total: seleccion.length,
      preguntas: seleccion.map((p) => ({
        id: p.id,
        pregunta: p.pregunta,
        opciones: mezclar((p.opciones as OpcionExamen[]) ?? []),
      })),
    })
  } catch (err) {
    console.error('[GET /api/examen]', err)
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

    const { respuestas } = (await request.json()) as {
      respuestas?: Record<string, string>
    }

    const idsRespondidos = Object.keys(respuestas ?? {})
    if (!idsRespondidos.length) {
      return NextResponse.json({ error: 'Respuestas requeridas' }, { status: 400 })
    }

    const { nivel: nivelActual, xp: xpActual } = await nivelDelUsuario(supabase, user.id)

    // La corrección lee respuesta_correcta, columna que el cliente NO puede leer
    // (ver migración 006). Por eso se consulta con el service client server-side.
    const service = createServiceClient()

    // Trae solo las preguntas del nivel actual que el usuario respondió (evita trampas).
    const { data: preguntas, error } = await service
      .from('preguntas_examen')
      .select('id, pregunta, opciones, respuesta_correcta, explicacion')
      .eq('nivel', nivelActual)
      .eq('activo', true)
      .in('id', idsRespondidos)
    if (error) throw error

    if (!preguntas?.length) {
      return NextResponse.json({ error: 'Preguntas no válidas para tu nivel' }, { status: 400 })
    }

    let correctas = 0
    const detalle = preguntas.map((p) => {
      const elegida = respuestas?.[p.id] ?? null
      const acerto = elegida === p.respuesta_correcta
      if (acerto) correctas++
      const opciones = (p.opciones as OpcionExamen[]) ?? []
      const textoCorrecta = opciones.find((o) => o.id === p.respuesta_correcta)?.texto ?? ''
      const textoElegida = opciones.find((o) => o.id === elegida)?.texto ?? null
      return {
        pregunta_id: p.id,
        pregunta: p.pregunta,
        acerto,
        tu_respuesta: textoElegida,
        respuesta_correcta: textoCorrecta,
        explicacion: p.explicacion ?? '',
      }
    })

    const total = detalle.length
    const porcentaje = Math.round((correctas / total) * 100)
    const aprobado = correctas / total >= UMBRAL_APROBACION

    let nivelNuevo: Nivel = nivelActual
    let xpGanado = 0

    if (aprobado) {
      xpGanado = XP_BONUS_APROBADO
      if (nivelActual < 4) {
        const destino = (nivelActual + 1) as Nivel
        const nuevoXp = Math.max(xpActual + XP_BONUS_APROBADO, umbralNivel(destino))
        nivelNuevo = calcularNivel(nuevoXp)
        await supabase
          .from('progreso_usuario')
          .upsert(
            { user_id: user.id, xp_total: nuevoXp, nivel: nivelNuevo },
            { onConflict: 'user_id' }
          )
      } else {
        // Ya está en el nivel máximo: solo suma XP de dominio.
        const nuevoXp = xpActual + XP_BONUS_APROBADO
        await supabase
          .from('progreso_usuario')
          .upsert(
            { user_id: user.id, xp_total: nuevoXp, nivel: nivelActual },
            { onConflict: 'user_id' }
          )
      }
    }

    await supabase.from('intentos_examen').insert({
      user_id: user.id,
      nivel: nivelActual,
      correctas,
      total,
      aprobado,
    })

    return NextResponse.json({
      aprobado,
      correctas,
      total,
      porcentaje,
      nivel_anterior: nivelActual,
      nivel_nuevo: nivelNuevo,
      subio_nivel: nivelNuevo > nivelActual,
      xp_ganado: xpGanado,
      detalle,
    })
  } catch (err) {
    console.error('[POST /api/examen]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { recalcularScore } from '@/lib/pym-score-server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    // Recalcula siempre con los datos en vivo (sin llamar a Claude) para que
    // el score nunca quede pegado en un valor antiguo.
    const actual = await recalcularScore(supabase, negocio)

    const { data: historicoDesc } = await supabase
      .from('pym_scores')
      .select('semana, score')
      .eq('negocio_id', negocio.id)
      .order('semana', { ascending: false })
      .limit(8)

    const historico = (historicoDesc ?? []).slice().reverse()

    return NextResponse.json({ actual, historico })
  } catch (err) {
    console.error('[GET /api/pym-score]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    // Recálculo manual: además regenera la explicación con Claude.
    const data = await recalcularScore(supabase, negocio, { regenerarExplicacion: true })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/pym-score]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { recalcularSalud } from '@/lib/salud-server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const actual = await recalcularSalud(supabase, negocio)

    const { data: historicoDesc } = await supabase
      .from('salud_financiera')
      .select('semana, indice')
      .eq('negocio_id', negocio.id)
      .order('semana', { ascending: false })
      .limit(8)

    const historico = (historicoDesc ?? []).slice().reverse().map((h) => ({
      semana: h.semana,
      indice: h.indice,
    }))

    return NextResponse.json({ actual, historico })
  } catch (err) {
    console.error('[GET /api/salud]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const data = await recalcularSalud(supabase, negocio, { regenerarExplicacion: true })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/salud]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { construirCompraInteligente } from '@/lib/compra-inteligente-server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json(
        { error: error ?? 'Negocio no encontrado' },
        { status: error === 'No autorizado' ? 401 : 404 }
      )
    }

    const resumen = await construirCompraInteligente(supabase, negocio)
    return NextResponse.json(resumen)
  } catch (err) {
    console.error('[GET /api/compra-inteligente]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

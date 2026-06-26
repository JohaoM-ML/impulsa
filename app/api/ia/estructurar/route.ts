import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { estructurarMovimiento, type TipoMovimiento } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { texto, tipo } = (await request.json()) as {
      texto?: string
      tipo?: TipoMovimiento
    }

    if (!texto?.trim()) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }

    // Carga el inventario para que Claude calce nombres y precios reales.
    const { data: inventario } = await supabase
      .from('productos')
      .select('nombre, precio_venta, precio_compra')
      .eq('negocio_id', negocio.id)
      .eq('activo', true)

    const productos = await estructurarMovimiento(
      texto,
      tipo === 'compra' ? 'compra' : 'venta',
      inventario ?? []
    )

    return NextResponse.json({ texto, productos })
  } catch (err) {
    console.error('[POST /api/ia/estructurar]', err)
    return NextResponse.json({ error: 'No se pudo interpretar el texto' }, { status: 500 })
  }
}

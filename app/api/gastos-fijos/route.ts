import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import type { CategoriaGastoFijo } from '@/types'

const CATEGORIAS_VALIDAS: CategoriaGastoFijo[] = [
  'alquiler',
  'luz',
  'agua',
  'internet',
  'sueldos',
  'otro',
]

const ETIQUETAS: Record<CategoriaGastoFijo, string> = {
  alquiler: 'Alquiler',
  luz: 'Luz',
  agua: 'Agua',
  internet: 'Internet',
  sueldos: 'Sueldos / empleados',
  otro: 'Otro gasto fijo',
}

interface GastoFijoInput {
  categoria: CategoriaGastoFijo
  monto: number
  descripcion?: string
}

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json(
        { error: error ?? 'Negocio no encontrado' },
        { status: error === 'No autorizado' ? 401 : 404 }
      )
    }

    const { data, error: dbError } = await supabase
      .from('gastos_fijos')
      .select('*')
      .eq('negocio_id', negocio.id)
      .eq('activo', true)
      .order('creado_en', { ascending: true })

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[GET /api/gastos-fijos]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json(
        { error: error ?? 'Negocio no encontrado' },
        { status: error === 'No autorizado' ? 401 : 404 }
      )
    }

    const body = (await request.json()) as { gastos?: GastoFijoInput[] }
    const gastos = body.gastos ?? []

    if (!Array.isArray(gastos)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
    }

    // Reemplaza la lista activa del negocio (onboarding envía el lote completo).
    await supabase.from('gastos_fijos').update({ activo: false }).eq('negocio_id', negocio.id)

    const insertados = []
    for (const g of gastos) {
      if (!CATEGORIAS_VALIDAS.includes(g.categoria)) {
        return NextResponse.json({ error: `Categoría inválida: ${g.categoria}` }, { status: 400 })
      }
      const monto = Number(g.monto)
      if (!monto || monto <= 0) {
        return NextResponse.json({ error: 'Cada gasto fijo debe tener un monto mayor a 0' }, { status: 400 })
      }

      const etiqueta = ETIQUETAS[g.categoria]
      const { data, error: insError } = await supabase
        .from('gastos_fijos')
        .insert({
          negocio_id: negocio.id,
          categoria: g.categoria,
          descripcion: g.descripcion?.trim() || etiqueta,
          monto,
          activo: true,
        })
        .select()
        .single()

      if (insError) throw insError
      insertados.push(data)

      // TODO: La auto-generación solo cubre el periodo actual.
      // La recurrencia mensual automática vía cron queda pendiente
      // (evita inflar liquidez en periodos siguientes sin lógica de deduplicación).
      const { error: gastoError } = await supabase.from('gastos').insert({
        negocio_id: negocio.id,
        descripcion: `${etiqueta} (fijo)`,
        monto,
        categoria: g.categoria,
      })
      if (gastoError) throw gastoError
    }

    return NextResponse.json(insertados, { status: 201 })
  } catch (err) {
    console.error('[POST /api/gastos-fijos]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

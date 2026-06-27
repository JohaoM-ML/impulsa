import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { normalizarHoraCierre } from '@/lib/timezone'
import type { ConfiguracionNegocio } from '@/types'

function horaDesdeDb(valor: string | null | undefined): string {
  if (!valor) return '21:00'
  return valor.slice(0, 5)
}

export async function GET() {
  try {
    const { negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json(
        { error: error ?? 'Negocio no encontrado' },
        { status: error === 'No autorizado' ? 401 : 404 }
      )
    }

    const config: ConfiguracionNegocio = {
      hora_cierre_dia: horaDesdeDb(negocio.hora_cierre_dia),
      resumen_diario_activo: negocio.resumen_diario_activo ?? true,
      telefono_wsp: negocio.telefono_wsp ?? null,
    }

    return NextResponse.json(config)
  } catch (err) {
    console.error('[GET /api/configuracion]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json(
        { error: error ?? 'Negocio no encontrado' },
        { status: error === 'No autorizado' ? 401 : 404 }
      )
    }

    const body = (await request.json()) as {
      hora_cierre_dia?: string
      resumen_diario_activo?: boolean
    }

    const updates: Record<string, string | boolean> = {}

    if (body.hora_cierre_dia !== undefined) {
      const hora = normalizarHoraCierre(body.hora_cierre_dia)
      if (!hora) {
        return NextResponse.json({ error: 'Hora de cierre no válida' }, { status: 400 })
      }
      updates.hora_cierre_dia = hora
    }

    if (body.resumen_diario_activo !== undefined) {
      if (typeof body.resumen_diario_activo !== 'boolean') {
        return NextResponse.json({ error: 'resumen_diario_activo debe ser boolean' }, { status: 400 })
      }
      updates.resumen_diario_activo = body.resumen_diario_activo
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const { data, error: updateError } = await supabase
      .from('negocios')
      .update(updates)
      .eq('id', negocio.id)
      .select('hora_cierre_dia, resumen_diario_activo, telefono_wsp')
      .single()

    if (updateError) throw updateError

    const config: ConfiguracionNegocio = {
      hora_cierre_dia: horaDesdeDb(data.hora_cierre_dia),
      resumen_diario_activo: data.resumen_diario_activo ?? true,
      telefono_wsp: data.telefono_wsp ?? null,
    }

    return NextResponse.json(config)
  } catch (err) {
    console.error('[PATCH /api/configuracion]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

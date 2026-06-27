import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'

function parseDiaVisita(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null
  const n = Number(valor)
  if (!Number.isInteger(n) || n < 0 || n > 6) return Number.NaN
  return n
}

function parseFrecuencia(valor: unknown): number {
  if (valor === undefined || valor === null || valor === '') return 7
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : Number.NaN
}

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { data, error: dbError } = await supabase
      .from('proveedores')
      .select('*')
      .eq('negocio_id', negocio.id)
      .order('nombre')

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[GET /api/proveedores]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { nombre, telefono, deuda_total, dia_visita, frecuencia_dias } = await request.json()
    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }
    const diaVisita = parseDiaVisita(dia_visita)
    const frecuencia = parseFrecuencia(frecuencia_dias)
    if (Number.isNaN(diaVisita) || Number.isNaN(frecuencia)) {
      return NextResponse.json({ error: 'Día de visita o frecuencia inválidos' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('proveedores')
      .insert({
        negocio_id: negocio.id,
        nombre: nombre.trim(),
        telefono: telefono ?? null,
        deuda_total: Number(deuda_total) || 0,
        dia_visita: diaVisita,
        frecuencia_dias: frecuencia,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/proveedores]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { id, deuda_total, dia_visita, frecuencia_dias, nombre, telefono } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }
    const diaVisita = parseDiaVisita(dia_visita)
    const frecuencia = parseFrecuencia(frecuencia_dias)
    if (Number.isNaN(diaVisita) || Number.isNaN(frecuencia)) {
      return NextResponse.json({ error: 'Día de visita o frecuencia inválidos' }, { status: 400 })
    }

    const cambios: {
      deuda_total?: number
      dia_visita?: number | null
      frecuencia_dias?: number
      nombre?: string
      telefono?: string | null
    } = {}
    if (deuda_total !== undefined) cambios.deuda_total = Number(deuda_total) || 0
    if (dia_visita !== undefined) cambios.dia_visita = diaVisita
    if (frecuencia_dias !== undefined) cambios.frecuencia_dias = frecuencia
    if (typeof nombre === 'string' && nombre.trim()) cambios.nombre = nombre.trim()
    if (telefono !== undefined) cambios.telefono = telefono || null

    const { data, error: dbError } = await supabase
      .from('proveedores')
      .update(cambios)
      .eq('id', id)
      .eq('negocio_id', negocio.id)
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/proveedores]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

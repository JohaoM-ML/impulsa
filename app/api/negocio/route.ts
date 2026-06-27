import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { validarTelefonoPeru } from '@/lib/telefono'

/** Focus group: bodegas / nanostores — no se pide rubro en el registro. */
const RUBRO_DEFECTO = 'Bodega'

export async function GET() {
  try {
    const { negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }
    return NextResponse.json(negocio)
  } catch (err) {
    console.error('[GET /api/negocio]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, negocio, error } = await getNegocioFromSession()
    if (error === 'No autorizado' || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (negocio) {
      return NextResponse.json(negocio)
    }

    const { nombre } = await request.json()
    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre del negocio requerido' }, { status: 400 })
    }

    const { data: nuevoNegocio, error: negocioError } = await supabase
      .from('negocios')
      .insert({ user_id: user.id, nombre: nombre.trim(), rubro: RUBRO_DEFECTO })
      .select()
      .single()

    if (negocioError) throw negocioError

    const { error: progresoError } = await supabase.from('progreso_usuario').insert({
      user_id: user.id,
      negocio_id: nuevoNegocio.id,
      nivel: 1,
      xp_total: 0,
      onboarding_completado: false,
    })

    if (progresoError) throw progresoError

    return NextResponse.json(nuevoNegocio, { status: 201 })
  } catch (err) {
    console.error('[POST /api/negocio]', err)
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

    const { telefono_wsp } = (await request.json()) as { telefono_wsp?: string }
    if (!telefono_wsp?.trim()) {
      return NextResponse.json({ error: 'Número de WhatsApp requerido' }, { status: 400 })
    }

    const validacion = validarTelefonoPeru(telefono_wsp)
    if (!validacion.ok) {
      return NextResponse.json({ error: validacion.error }, { status: 400 })
    }

    // Formato canónico: solo dígitos E.164 sin "+" (ej. 51924128677).
    // Debe coincidir con normalizarTelefono() en /api/chatbot y el lookup
    // .in('telefono_wsp', [telefono, `+${telefono}`, `whatsapp:+${telefono}`]).
    const { data, error: updateError } = await supabase
      .from('negocios')
      .update({ telefono_wsp: validacion.telefono })
      .eq('id', negocio.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'Ese WhatsApp ya está registrado' }, { status: 409 })
      }
      throw updateError
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/negocio]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

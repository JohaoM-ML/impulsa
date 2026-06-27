import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { data, error: dbError } = await supabase
      .from('productos')
      .select('*')
      .eq('negocio_id', negocio.id)
      .eq('activo', true)
      .order('nombre')

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[GET /api/inventario]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const body = await request.json()
    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('productos')
      .insert({
        negocio_id: negocio.id,
        nombre: body.nombre.trim(),
        unidad: body.unidad ?? 'unidades',
        stock_actual: body.stock_actual ?? 0,
        stock_minimo: body.stock_minimo ?? 5,
        precio_compra: body.precio_compra ?? null,
        precio_venta: body.precio_venta ?? null,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/inventario]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const proveedorId =
      typeof body.proveedor_id === 'string' && body.proveedor_id.trim()
        ? body.proveedor_id
        : null

    if (proveedorId) {
      const { data: proveedor, error: proveedorError } = await supabase
        .from('proveedores')
        .select('id')
        .eq('id', proveedorId)
        .eq('negocio_id', negocio.id)
        .maybeSingle()

      if (proveedorError) throw proveedorError
      if (!proveedor) {
        return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
      }
    }

    const factorCompra =
      body.factor_compra === undefined || body.factor_compra === null || body.factor_compra === ''
        ? 1
        : Number(body.factor_compra)
    if (!Number.isFinite(factorCompra) || factorCompra <= 0) {
      return NextResponse.json({ error: 'Factor de compra inválido' }, { status: 400 })
    }

    const { data, error: dbError } = await supabase
      .from('productos')
      .update({
        proveedor_id: proveedorId,
        unidad_compra:
          typeof body.unidad_compra === 'string' && body.unidad_compra.trim()
            ? body.unidad_compra.trim()
            : null,
        factor_compra: factorCompra,
      })
      .eq('id', body.id)
      .eq('negocio_id', negocio.id)
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/inventario]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

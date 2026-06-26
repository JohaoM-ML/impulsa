import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import type { OCRProductoDetectado } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { productos, texto_raw, imagen_url } = await request.json() as {
      productos: OCRProductoDetectado[]
      texto_raw?: string
      imagen_url?: string
    }

    if (!productos?.length) {
      return NextResponse.json({ error: 'No hay productos para guardar' }, { status: 400 })
    }

    if (texto_raw || imagen_url) {
      await supabase.from('guias_proveedor').insert({
        negocio_id: negocio.id,
        texto_raw: texto_raw ?? null,
        imagen_url: imagen_url ?? null,
        total: productos.reduce(
          (s, p) => s + p.cantidad * (p.precio_unit ?? 0),
          0
        ),
        estado: 'procesada',
      })
    }

    // Trae el inventario actual para decidir entre actualizar (sumar stock) o crear.
    const { data: existentes } = await supabase
      .from('productos')
      .select('id, nombre, stock_actual, precio_compra')
      .eq('negocio_id', negocio.id)

    const mapaExistentes = new Map(
      (existentes ?? []).map((p) => [p.nombre.trim().toLowerCase(), p])
    )

    let creados = 0
    let actualizados = 0

    for (const p of productos) {
      const clave = p.nombre.trim().toLowerCase()
      const existente = mapaExistentes.get(clave)

      if (existente) {
        await supabase
          .from('productos')
          .update({
            stock_actual: Number(existente.stock_actual ?? 0) + p.cantidad,
            precio_compra: p.precio_unit ?? existente.precio_compra ?? null,
            actualizado_en: new Date().toISOString(),
          })
          .eq('id', existente.id)
        actualizados++
      } else {
        await supabase.from('productos').insert({
          negocio_id: negocio.id,
          nombre: p.nombre,
          stock_actual: p.cantidad,
          stock_minimo: 5,
          precio_compra: p.precio_unit ?? null,
          precio_venta: p.precio_unit ? Math.round(p.precio_unit * 1.2 * 100) / 100 : null,
          unidad: 'unidades',
          activo: true,
        })
        creados++
      }
    }

    return NextResponse.json({ creados, actualizados }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/inventario/bulk]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

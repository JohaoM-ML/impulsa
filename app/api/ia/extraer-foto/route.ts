import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { extraerItemsDeImagen, type TipoMovimiento } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const { error } = await getNegocioFromSession()
    if (error) {
      return NextResponse.json({ error }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { imagen, tipo } = (await request.json()) as {
      imagen?: string
      tipo?: TipoMovimiento
    }

    if (!imagen || typeof imagen !== 'string') {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })
    }

    // Límite de tamaño para no enviar imágenes enormes al modelo (~6MB de imagen real).
    const MAX_BYTES = 6 * 1024 * 1024
    const base64 = imagen.replace(/^data:image\/\w+;base64,/, '')
    const bytesAprox = Math.floor((base64.length * 3) / 4)
    if (bytesAprox > MAX_BYTES) {
      return NextResponse.json(
        { error: 'La imagen es muy grande. Toma la foto con menor resolución (máx. 6MB).' },
        { status: 413 }
      )
    }

    const resultado = await extraerItemsDeImagen(imagen, tipo === 'compra' ? 'compra' : 'venta')
    return NextResponse.json(resultado)
  } catch (err) {
    console.error('[POST /api/ia/extraer-foto]', err)
    return NextResponse.json({ error: 'No se pudo leer la imagen' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { extraerProductosDeImagen } from '@/lib/vision'

export async function POST(request: NextRequest) {
  try {
    const { error } = await getNegocioFromSession()
    if (error) {
      return NextResponse.json({ error }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    const { imagen } = await request.json()
    if (!imagen || typeof imagen !== 'string') {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })
    }

    // Límite de tamaño para no quemar cuota de Google Vision con imágenes enormes.
    // Vision recomienda < 10MB; aquí cortamos antes (~6MB de imagen real).
    const MAX_BYTES = 6 * 1024 * 1024
    const base64 = imagen.replace(/^data:image\/\w+;base64,/, '')
    const bytesAprox = Math.floor((base64.length * 3) / 4)
    if (bytesAprox > MAX_BYTES) {
      return NextResponse.json(
        { error: 'La imagen es muy grande. Toma la foto con menor resolución (máx. 6MB).' },
        { status: 413 }
      )
    }

    const resultado = await extraerProductosDeImagen(imagen)
    return NextResponse.json(resultado)
  } catch (err) {
    console.error('[POST /api/ocr]', err)
    return NextResponse.json({ error: 'Error al procesar imagen' }, { status: 500 })
  }
}

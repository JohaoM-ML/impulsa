import { NextRequest, NextResponse } from 'next/server'
import { analizarFotoVenta } from '@/lib/claude'
import { getNegocioFromSession } from '@/lib/supabase/server'

function extensionDesdeDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+);base64,/)
  const ext = match?.[1]?.toLowerCase()
  if (ext === 'png' || ext === 'webp' || ext === 'gif') return ext
  return 'jpg'
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, negocio, error } = await getNegocioFromSession()
    if (error || !negocio || !user) {
      return NextResponse.json(
        { error: error ?? 'Negocio no encontrado' },
        { status: error === 'No autorizado' ? 401 : 404 }
      )
    }

    const { imagen } = (await request.json()) as { imagen?: string }
    if (!imagen?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Imagen inválida' }, { status: 400 })
    }

    const base64 = imagen.replace(/^data:image\/\w+;base64,/, '')
    const bytesAprox = Math.floor((base64.length * 3) / 4)
    const maxBytes = 6 * 1024 * 1024
    if (bytesAprox > maxBytes) {
      return NextResponse.json(
        { error: 'La imagen es muy grande. Toma la foto con menor resolución (máx. 6MB).' },
        { status: 413 }
      )
    }

    const analisis = await analizarFotoVenta(imagen)

    if (analisis.tipo === 'productos') {
      return NextResponse.json({ tipo: 'productos', texto: analisis.texto, productos: analisis.productos })
    }

    // Comprobante: guardamos la imagen como respaldo, pero la subida es best-effort:
    // si el bucket/policy no está listo, igual devolvemos el comprobante detectado.
    let comprobante_url: string | null = null
    try {
      const buffer = Buffer.from(base64, 'base64')
      const ext = extensionDesdeDataUrl(imagen)
      const path = `${user.id}/${negocio.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(path, buffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: false,
        })
      if (uploadError) throw uploadError
      comprobante_url = path
    } catch (uploadErr) {
      console.error('[POST /api/ia/analizar-foto-venta] subida comprobante', uploadErr)
    }

    return NextResponse.json({
      tipo: 'comprobante',
      ...analisis.comprobante,
      comprobante_url,
    })
  } catch (err) {
    console.error('[POST /api/ia/analizar-foto-venta]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

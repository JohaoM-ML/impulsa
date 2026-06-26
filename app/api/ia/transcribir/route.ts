import { NextRequest, NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { openaiConfigurada, transcribirAudio } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { error } = await getNegocioFromSession()
    if (error) {
      return NextResponse.json({ error }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    if (!openaiConfigurada()) {
      return NextResponse.json(
        { error: 'La transcripción por voz no está configurada (falta OPENAI_API_KEY).' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const audio = formData.get('audio')

    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: 'Audio requerido' }, { status: 400 })
    }

    const MAX_BYTES = 20 * 1024 * 1024
    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ error: 'El audio es muy largo (máx. 20MB).' }, { status: 413 })
    }

    const buffer = Buffer.from(await audio.arrayBuffer())
    const nombre = audio instanceof File ? audio.name : 'audio.webm'
    const texto = await transcribirAudio(buffer, nombre || 'audio.webm')

    return NextResponse.json({ texto })
  } catch (err) {
    console.error('[POST /api/ia/transcribir]', err)
    return NextResponse.json({ error: 'No se pudo transcribir el audio' }, { status: 500 })
  }
}

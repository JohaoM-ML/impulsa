import OpenAI, { toFile } from 'openai'

// Claude no acepta audio, así que la transcripción de voz va por OpenAI.
export const MODELO_TRANSCRIPCION = 'whisper-1'

export function openaiConfigurada(): boolean {
  return !!process.env.OPENAI_API_KEY
}

export function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * Transcribe un audio (grabado en el navegador) a texto en español.
 * Lanza si falta la API key para que la ruta devuelva un error claro.
 */
export async function transcribirAudio(
  buffer: Buffer,
  filename = 'audio.webm'
): Promise<string> {
  if (!openaiConfigurada()) {
    throw new Error('OPENAI_API_KEY no configurada')
  }
  const client = getOpenAIClient()
  const file = await toFile(buffer, filename)
  const res = await client.audio.transcriptions.create({
    file,
    model: MODELO_TRANSCRIPCION,
    language: 'es',
  })
  return res.text
}

import { transcribirAudio } from '@/lib/openai'
import { credencialesTwilio } from '@/lib/twilio'

function extensionDesdeContentType(contentType: string | undefined): string {
  if (!contentType) return 'audio.ogg'
  if (contentType.includes('ogg')) return 'audio.ogg'
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'audio.mp3'
  if (contentType.includes('wav')) return 'audio.wav'
  if (contentType.includes('webm')) return 'audio.webm'
  return 'audio.ogg'
}

function extensionImagenDesdeContentType(contentType: string | undefined): string {
  if (!contentType) return 'jpg'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}

export async function descargarMediaTwilio(
  mediaUrl: string,
  mediaContentType?: string
): Promise<{ buffer: Buffer; dataUrl: string; extension: string }> {
  const creds = credencialesTwilio()
  if (!creds) {
    throw new Error('Credenciales Twilio no configuradas')
  }

  const auth = Buffer.from(`${creds.user}:${creds.pass}`).toString('base64')
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
  })

  if (!res.ok) {
    throw new Error(`Twilio media download failed: ${res.status}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  const extension = extensionImagenDesdeContentType(mediaContentType)
  const mime = mediaContentType?.startsWith('image/')
    ? mediaContentType
    : `image/${extension === 'jpg' ? 'jpeg' : extension}`
  return {
    buffer,
    extension,
    dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
  }
}

/**
 * Descarga media de Twilio (requiere credenciales server-side) y transcribe con Whisper.
 */
export async function transcribirMediaTwilio(
  mediaUrl: string,
  mediaContentType?: string
): Promise<string> {
  const creds = credencialesTwilio()
  if (!creds) {
    throw new Error('Credenciales Twilio no configuradas')
  }

  const auth = Buffer.from(`${creds.user}:${creds.pass}`).toString('base64')
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
  })

  if (!res.ok) {
    throw new Error(`Twilio media download failed: ${res.status}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  const ext = extensionDesdeContentType(mediaContentType)
  return transcribirAudio(buffer, ext)
}

export function twilioMediaConfigurado(): boolean {
  return credencialesTwilio() !== null && !!process.env.OPENAI_API_KEY
}

export function twilioMediaImagenConfigurado(): boolean {
  return credencialesTwilio() !== null && !!process.env.ANTHROPIC_API_KEY
}

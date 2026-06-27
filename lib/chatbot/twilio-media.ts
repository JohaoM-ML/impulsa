import { transcribirAudio } from '@/lib/openai'

function credencialesTwilio(): { user: string; pass: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const apiKeySid = process.env.TWILIO_API_KEY_SID
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (sid && apiKeySid && apiKeySecret) {
    return { user: apiKeySid, pass: apiKeySecret }
  }
  if (sid && authToken) {
    return { user: sid, pass: authToken }
  }
  return null
}

function extensionDesdeContentType(contentType: string | undefined): string {
  if (!contentType) return 'audio.ogg'
  if (contentType.includes('ogg')) return 'audio.ogg'
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'audio.mp3'
  if (contentType.includes('wav')) return 'audio.wav'
  if (contentType.includes('webm')) return 'audio.webm'
  return 'audio.ogg'
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

export function credencialesTwilio(): { user: string; pass: string; accountSid: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const apiKeySid = process.env.TWILIO_API_KEY_SID
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (accountSid && apiKeySid && apiKeySecret) {
    return { user: apiKeySid, pass: apiKeySecret, accountSid }
  }
  if (accountSid && authToken) {
    return { user: accountSid, pass: authToken, accountSid }
  }
  return null
}

export function twilioConfigurado(): boolean {
  return credencialesTwilio() !== null && !!process.env.TWILIO_WHATSAPP_FROM
}

/**
 * Envía un mensaje de WhatsApp saliente vía Twilio REST API.
 * `telefono` debe ser dígitos E.164 sin "+" (ej. 51987654321).
 */
export async function enviarWhatsApp(telefono: string, cuerpo: string): Promise<void> {
  const creds = credencialesTwilio()
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!creds || !from) {
    throw new Error('Twilio no configurado para envío')
  }

  const auth = Buffer.from(`${creds.user}:${creds.pass}`).toString('base64')
  const body = new URLSearchParams({
    To: `whatsapp:+${telefono}`,
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    Body: cuerpo,
  })

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  )

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Twilio send failed: ${res.status} ${errText}`)
  }
}

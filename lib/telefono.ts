/**
 * Normaliza teléfonos al mismo formato que usa /api/chatbot (normalizarTelefono)
 * y el lookup en negocios.telefono_wsp: solo dígitos E.164 sin "+" ni "whatsapp:".
 * Ejemplo canónico: "51924128677" (como en n8n/README y Bodeguita de prueba).
 */
export function normalizarTelefonoWsp(raw: string): string {
  return raw
    .trim()
    .replace(/^whatsapp:/i, '')
    .replace(/^\+/, '')
    .replace(/\D/g, '')
}

/**
 * Valida y normaliza un móvil peruano para guardar en telefono_wsp.
 * Acepta 9 dígitos (9XXXXXXXX) o 11 con código país (51XXXXXXXXX).
 */
export function validarTelefonoPeru(raw: string): { ok: true; telefono: string } | { ok: false; error: string } {
  let digits = normalizarTelefonoWsp(raw)

  if (digits.length === 9 && digits.startsWith('9')) {
    digits = `51${digits}`
  }

  if (digits.length !== 11 || !digits.startsWith('51')) {
    return { ok: false, error: 'Ingresa un celular peruano válido (9 dígitos).' }
  }

  const movil = digits.slice(2)
  if (!movil.startsWith('9') || movil.length !== 9) {
    return { ok: false, error: 'El número debe ser un celular que empiece en 9.' }
  }

  return { ok: true, telefono: digits }
}

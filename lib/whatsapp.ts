/**
 * Helper para el botón "Chatear por WhatsApp" (bosquejo funcional).
 *
 * Arquitectura: Impulsa usa UN solo número de WhatsApp (sandbox Twilio ahora,
 * Business Sender en producción). Todos los bodegueros le escriben a ese mismo
 * número; cada negocio se distingue por su propio teléfono (telefono_wsp) en
 * /api/chatbot, no por el número de destino. Por eso el link es el mismo para todos.
 *
 * El número es público (va en la URL wa.me), por eso usa NEXT_PUBLIC_.
 * Formato esperado: solo dígitos E.164 sin "+" (ej. 14155238886).
 */

const MENSAJE_POR_DEFECTO = 'Hola Impulsa, quiero registrar un movimiento de mi negocio'

/** Devuelve el número configurado (solo dígitos) o null si no está seteado. */
export function getWhatsAppNumero(): string | null {
  const numero = (process.env.NEXT_PUBLIC_WHATSAPP_NUMERO ?? '').replace(/\D/g, '')
  return numero.length > 0 ? numero : null
}

/** Arma la URL de WhatsApp con mensaje pre-cargado. Null si no hay número. */
export function getWhatsAppUrl(mensaje: string = MENSAJE_POR_DEFECTO): string | null {
  const numero = getWhatsAppNumero()
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

'use client'

import { MessageCircle } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/whatsapp'

/**
 * Botón flotante (FAB) circular "Chatear por WhatsApp".
 * Fijo en la esquina inferior derecha, por encima de la barra de navegación.
 * Abre el chat con el número de Impulsa y un mensaje pre-cargado.
 * Si NEXT_PUBLIC_WHATSAPP_NUMERO no está configurado, no renderiza nada
 * (evita un link roto en la demo).
 */
export function BotonWhatsApp({
  mensaje,
}: {
  mensaje?: string
  nota?: string
}) {
  const url = getWhatsAppUrl(mensaje)
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatear con Chaski por WhatsApp"
      className="animate-float fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform active:scale-95"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  )
}

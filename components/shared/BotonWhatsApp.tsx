'use client'

import { MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getWhatsAppUrl } from '@/lib/whatsapp'

/**
 * Botón "Chatear por WhatsApp" (bosquejo funcional).
 * Abre el chat con el número de Impulsa y un mensaje pre-cargado.
 * Si NEXT_PUBLIC_WHATSAPP_NUMERO no está configurado, no renderiza nada
 * (evita un link roto en la demo).
 */
export function BotonWhatsApp({
  mensaje,
  nota,
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
    >
      <Card className="border-0 bg-[#25D366] text-white transition-transform active:scale-[0.98]">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <MessageCircle className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="font-semibold leading-tight">Chatear con Chaski por WhatsApp</p>
            <p className="text-sm text-white/90">Registra y consulta tu negocio por chat →</p>
            {nota && <p className="mt-1 text-xs text-white/80">{nota}</p>}
          </div>
        </CardContent>
      </Card>
    </a>
  )
}

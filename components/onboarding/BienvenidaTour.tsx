'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

/** Toast de bienvenida al llegar desde onboarding (?tour=1). Fase 2: tutorial guiado completo. */
export function BienvenidaTour() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('tour') === '1') {
      toast({
        title: '¡Bienvenido a Impulsa!',
        description:
          'Usa Registrar para anotar ventas, Mi Negocio para ver tu inventario y Salud para conocer cómo va tu negocio.',
      })
      router.replace('/inicio')
    }
  }, [searchParams, router])

  return null
}

'use client'

import { useEffect, useState } from 'react'
import { InsigniaSubida } from '@/components/nivel/InsigniaSubida'
import { marcarNivelCelebrado, nivelYaCelebrado } from '@/lib/celebracion-nivel'
import { EVENTO_NIVEL, type DetalleSubidaNivel } from '@/hooks/useNivel'
import type { Nivel } from '@/lib/vocabulario'

/**
 * Escucha subidas de nivel en toda la app y muestra la insignia una sola vez
 * por cada nivel alcanzado (persistido en localStorage).
 */
export function CelebracionNivel() {
  const [subida, setSubida] = useState<DetalleSubidaNivel | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detalle = (e as CustomEvent<DetalleSubidaNivel | undefined>).detail
      if (!detalle) return
      if (detalle.nivelNuevo <= detalle.nivelAnterior) return
      if (nivelYaCelebrado(detalle.nivelNuevo)) return

      setSubida(detalle)
    }

    window.addEventListener(EVENTO_NIVEL, handler)
    return () => window.removeEventListener(EVENTO_NIVEL, handler)
  }, [])

  function cerrar() {
    if (subida) marcarNivelCelebrado(subida.nivelNuevo)
    setSubida(null)
  }

  if (!subida) return null

  return (
    <InsigniaSubida
      nivel={subida.nivelNuevo as Nivel}
      nivelAnterior={subida.nivelAnterior as Nivel}
      onCerrar={cerrar}
    />
  )
}

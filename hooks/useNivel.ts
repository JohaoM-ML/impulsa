'use client'

import { useCallback, useEffect, useState } from 'react'
import { calcularNivel } from '@/lib/nivel'
import { vocab, type VocabKey, type Nivel } from '@/lib/vocabulario'
import type { ProgresoUsuario } from '@/types'

const EVENTO_NIVEL = 'nivel:actualizar'

export type DetalleSubidaNivel = {
  nivelAnterior: Nivel
  nivelNuevo: Nivel
}

export { EVENTO_NIVEL }

/**
 * Avisa a todas las instancias de useNivel que el progreso cambió.
 * Si incluye detalle de subida, puede disparar la celebración (una sola vez por nivel).
 */
export function notificarCambioNivel(detalle?: DetalleSubidaNivel) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_NIVEL, { detail: detalle }))
  }
}

export function useNivel() {
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nivel')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'No se pudo cargar el progreso')
      }
      const data = await res.json()
      setProgreso(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar nivel')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const handler = () => cargar()
    window.addEventListener(EVENTO_NIVEL, handler)
    return () => window.removeEventListener(EVENTO_NIVEL, handler)
  }, [cargar])

  const xp = progreso?.xp_total ?? 0
  const nivel = calcularNivel(xp) as Nivel
  const v = (key: VocabKey) => vocab(key, nivel)

  return {
    nivel,
    vocab: v,
    xp,
    progreso,
    loading,
    error,
    recargar: cargar,
    onboardingCompletado: progreso?.onboarding_completado ?? false,
    tutorialVisto: progreso?.tutorial_visto ?? true,
  }
}

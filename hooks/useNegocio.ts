'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Negocio } from '@/types'

export function useNegocio() {
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/negocio')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'No se pudo cargar el negocio')
      }
      setNegocio(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar negocio')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { negocio, loading, error, recargar: cargar }
}

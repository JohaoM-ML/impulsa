'use client'

import { useCallback, useEffect, useState } from 'react'
import type { VentaConItems } from '@/types'

export function useVentas() {
  const [ventas, setVentas] = useState<VentaConItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ventas')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'No se pudieron cargar las ventas')
      }
      setVentas(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { ventas, loading, error, recargar: cargar }
}

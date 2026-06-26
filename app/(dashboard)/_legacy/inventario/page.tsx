'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { EstadoVacio } from '@/components/estados/EstadoVacio'
import { useNivel } from '@/hooks/useNivel'
import type { Producto } from '@/types'

/** @deprecated Usar /mi-negocio (tab Inventario) — conservado solo como referencia */
export default function InventarioPage() {
  const { vocab } = useNivel()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/inventario')
      if (!res.ok) throw new Error('No se pudo cargar inventario')
      setProductos(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={cargar} />
  if (!productos.length) {
    return (
      <div className="p-4">
        <EstadoVacio
          mensaje="Tu inventario está vacío"
          accionHref="/registrar"
          accionLabel="Cargar guía con foto"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Inventario</h1>
        <Button asChild size="sm" className="min-h-[48px]">
          <Link href="/registrar">+ Guía OCR</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {productos.map((p) => {
          const bajo = Number(p.stock_actual) <= Number(p.stock_minimo)
          return (
            <Card key={p.id} className={bajo ? 'border-destructive/50' : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Stock: {p.stock_actual} {p.unidad}</p>
                {bajo && (
                  <p className="mt-1 text-destructive">{vocab('inventario_bajo')}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

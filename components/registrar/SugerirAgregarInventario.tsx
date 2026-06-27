'use client'

import { useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { OCRProductoDetectado } from '@/types'

export function SugerirAgregarInventario({
  productos,
  onAgregarYContinuar,
  onSoloContinuar,
  onCancelar,
  loading,
}: {
  productos: OCRProductoDetectado[]
  onAgregarYContinuar: (seleccionados: OCRProductoDetectado[]) => void
  onSoloContinuar: () => void
  onCancelar: () => void
  loading?: boolean
}) {
  const [seleccion, setSeleccion] = useState<Set<string>>(
    () => new Set(productos.map((p) => p.nombre.trim().toLowerCase()))
  )

  function toggle(nombre: string) {
    const clave = nombre.trim().toLowerCase()
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (next.has(clave)) next.delete(clave)
      else next.add(clave)
      return next
    })
  }

  const elegidos = productos.filter((p) => seleccion.has(p.nombre.trim().toLowerCase()))

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <PackagePlus className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-brand-dark">Productos nuevos</h2>
          <p className="text-sm text-muted-foreground">
            Estos productos no están en tu inventario. ¿Quieres agregarlos para que las
            próximas ventas descuenten stock?
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {productos.map((p) => {
          const clave = p.nombre.trim().toLowerCase()
          const marcado = seleccion.has(clave)
          return (
            <Card
              key={clave}
              className={marcado ? 'border-primary/40 bg-brand-tint/35' : 'opacity-70'}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => toggle(p.nombre)}
                  className="h-5 w-5 rounded border-muted-foreground"
                  aria-label={`Agregar ${p.nombre} al inventario`}
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Venta S/ {(p.precio_unit ?? 0).toFixed(2)} · stock inicial sugerido:{' '}
                    {Math.max(p.cantidad, 10)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button
        size="xl"
        className="w-full"
        disabled={loading || elegidos.length === 0}
        onClick={() => onAgregarYContinuar(elegidos)}
      >
        {loading
          ? 'Guardando...'
          : `Agregar ${elegidos.length} y registrar venta`}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={onSoloContinuar}
      >
        Registrar sin agregar al inventario
      </Button>
      <Button variant="ghost" className="w-full" disabled={loading} onClick={onCancelar}>
        Volver a revisar
      </Button>
    </div>
  )
}

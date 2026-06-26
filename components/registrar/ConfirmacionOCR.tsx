'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OCRProductoDetectado, Producto } from '@/types'
import { matchProductoInventario } from '@/lib/inventario-match'

export function ConfirmacionOCR({
  productos,
  onConfirmar,
  onCancelar,
  loading,
  titulo = 'Revisa los productos detectados',
  labelConfirmar = 'Confirmar y guardar',
  labelCancelar = 'Volver',
  inventario,
}: {
  productos: OCRProductoDetectado[]
  onConfirmar: (items: OCRProductoDetectado[]) => void
  onCancelar: () => void
  loading?: boolean
  titulo?: string
  labelConfirmar?: string
  labelCancelar?: string
  inventario?: Pick<Producto, 'id' | 'nombre' | 'precio_venta' | 'precio_compra'>[]
}) {
  const [items, setItems] = useState(productos)

  function actualizar(i: number, campo: keyof OCRProductoDetectado, valor: string) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              [campo]: campo === 'nombre' ? valor : parseFloat(valor) || 0,
            }
          : item
      )
    )
  }

  function eliminar(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <p className="text-sm text-muted-foreground">
        Confirma que los datos sean correctos antes de guardar.
      </p>

      <div className="space-y-3">
        {items.map((item, i) => {
          const enInventario = inventario ? !!matchProductoInventario(item.nombre, inventario) : null
          return (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Producto {i + 1}</CardTitle>
                {enInventario === true && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                    En inventario
                  </span>
                )}
                {enInventario === false && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                    Nuevo
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => eliminar(i)}
                className="text-xs text-destructive underline"
              >
                Quitar
              </button>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={item.nombre}
                onChange={(e) => actualizar(i, 'nombre', e.target.value)}
                placeholder="Nombre"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={item.cantidad}
                  onChange={(e) => actualizar(i, 'cantidad', e.target.value)}
                  placeholder="Cantidad"
                />
                <Input
                  type="number"
                  value={item.precio_unit ?? ''}
                  onChange={(e) => actualizar(i, 'precio_unit', e.target.value)}
                  placeholder="Precio"
                />
              </div>
            </CardContent>
          </Card>
        )})}
      </div>

      <Button
        className="w-full min-h-[48px]"
        disabled={loading || !items.length}
        onClick={() => onConfirmar(items)}
      >
        {loading ? 'Guardando...' : labelConfirmar}
      </Button>
      <Button variant="outline" className="w-full min-h-[48px]" onClick={onCancelar} disabled={loading}>
        {labelCancelar}
      </Button>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { formatSoles } from '@/lib/utils'

/** @deprecated Usar /registrar — conservado solo como referencia */
export default function NuevaVentaPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [precio, setPrecio] = useState('')
  const [loading, setLoading] = useState(false)

  const total = (parseFloat(cantidad) || 0) * (parseFloat(precio) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            nombre_item: nombre,
            cantidad: parseFloat(cantidad),
            precio_unit: parseFloat(precio),
          },
        ],
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Error', description: data.error || 'No se pudo registrar', variant: 'destructive' })
      return
    }

    toast({ title: 'Venta registrada', description: formatSoles(total) })
    router.push('/registrar')
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Nueva venta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Producto</Label>
              <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min="0.01"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio">Precio unitario (S/)</Label>
              <Input
                id="precio"
                type="number"
                min="0.01"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
              />
            </div>
            <p className="text-lg font-semibold">Total: {formatSoles(total)}</p>
            <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar venta'}
            </Button>
            <Button type="button" variant="outline" className="w-full min-h-[48px]" asChild>
              <Link href="/registrar">Cancelar</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

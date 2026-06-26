'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { EstadoVacio } from '@/components/estados/EstadoVacio'
import { useNivel } from '@/hooks/useNivel'
import { toast } from '@/hooks/use-toast'
import { formatSoles } from '@/lib/utils'
import type { Cliente } from '@/types'

export default function ClientesPage() {
  const { vocab } = useNivel()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clientes')
      if (!res.ok) throw new Error('Error al cargar clientes')
      setClientes(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono }),
    })
    if (!res.ok) {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
      return
    }
    setNombre('')
    setTelefono('')
    toast({ title: 'Cliente agregado' })
    cargar()
  }

  if (loading) return <EstadoCargando />

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Clientes</h1>
      <p className="text-sm text-muted-foreground">{vocab('deuda_cobrar')}</p>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border p-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tel">Teléfono</Label>
          <Input id="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <Button type="submit" className="w-full min-h-[48px]">
          Agregar cliente
        </Button>
      </form>

      {error && <EstadoError mensaje={error} onReintentar={cargar} />}
      {!clientes.length && !error && <EstadoVacio mensaje="Sin clientes registrados" />}

      <div className="space-y-2">
        {clientes.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex justify-between p-4">
              <div>
                <p className="font-medium">{c.nombre}</p>
                {c.telefono && <p className="text-xs text-muted-foreground">{c.telefono}</p>}
              </div>
              <p className="text-sm font-semibold text-destructive">
                {formatSoles(Number(c.deuda_total))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

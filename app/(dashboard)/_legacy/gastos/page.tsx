'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { EstadoVacio } from '@/components/estados/EstadoVacio'
import { useNivel } from '@/hooks/useNivel'
import { toast } from '@/hooks/use-toast'
import { formatSoles } from '@/lib/utils'
import type { Gasto } from '@/types'

export default function GastosPage() {
  const { nivel, vocab } = useNivel()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gastos')
      if (!res.ok) throw new Error('Error al cargar gastos')
      setGastos(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (nivel < 2) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Sube al nivel 2 para registrar {vocab('gasto')}.
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const res = await fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descripcion, monto: parseFloat(monto) }),
    })
    setGuardando(false)
    if (!res.ok) {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
      return
    }
    setDescripcion('')
    setMonto('')
    toast({ title: 'Gasto registrado' })
    cargar()
  }

  if (loading) return <EstadoCargando />

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">{vocab('gasto')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="desc">Descripción</Label>
              <Input id="desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto (S/)</Label>
              <Input id="monto" type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full min-h-[48px]" disabled={guardando}>
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <EstadoError mensaje={error} onReintentar={cargar} />}
      {!gastos.length && !error && <EstadoVacio mensaje="Sin gastos registrados" />}

      <div className="space-y-2">
        {gastos.map((g) => (
          <Card key={g.id}>
            <CardContent className="flex justify-between p-4">
              <div>
                <p className="font-medium">{g.descripcion}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(g.creado_en).toLocaleDateString('es-PE')}
                </p>
              </div>
              <p className="font-semibold">{formatSoles(Number(g.monto))}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

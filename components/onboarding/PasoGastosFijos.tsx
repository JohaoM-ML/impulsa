'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatSoles } from '@/lib/utils'
import type { CategoriaGastoFijo } from '@/types'

const CATEGORIAS: { value: CategoriaGastoFijo; label: string }[] = [
  { value: 'alquiler', label: 'Alquiler del local' },
  { value: 'luz', label: 'Luz' },
  { value: 'agua', label: 'Agua' },
  { value: 'internet', label: 'Internet / teléfono' },
  { value: 'sueldos', label: 'Sueldos / empleados' },
  { value: 'otro', label: 'Otro gasto fijo' },
]

interface ItemGastoFijo {
  categoria: CategoriaGastoFijo
  monto: number
}

interface PasoGastosFijosProps {
  onContinuar: () => void
}

export function PasoGastosFijos({ onContinuar }: PasoGastosFijosProps) {
  const [categoria, setCategoria] = useState<CategoriaGastoFijo>('alquiler')
  const [monto, setMonto] = useState('')
  const [items, setItems] = useState<ItemGastoFijo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function agregar() {
    const valor = Number(monto)
    if (!valor || valor <= 0) {
      setError('Ingresa un monto mayor a 0')
      return
    }
    setError(null)
    setItems((prev) => [...prev.filter((i) => i.categoria !== categoria), { categoria, monto: valor }])
    setMonto('')
  }

  function quitar(cat: CategoriaGastoFijo) {
    setItems((prev) => prev.filter((i) => i.categoria !== cat))
  }

  async function guardarYContinuar() {
    if (items.length === 0) {
      onContinuar()
      return
    }

    setLoading(true)
    setError(null)
    const res = await fetch('/api/gastos-fijos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gastos: items }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'No se pudieron guardar los gastos fijos')
      setLoading(false)
      return
    }
    onContinuar()
  }

  const etiqueta = (cat: CategoriaGastoFijo) => CATEGORIAS.find((c) => c.value === cat)?.label ?? cat

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gastos fijos del mes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cuéntanos cuánto pagas cada mes en alquiler, servicios y sueldos. Nos ayuda a medir tu salud financiera.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de gasto</Label>
          <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaGastoFijo)}>
            <SelectTrigger className="min-h-[48px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="monto-fijo">Monto mensual (S/)</Label>
            <Input
              id="monto-fijo"
              type="number"
              min="1"
              step="0.01"
              className="min-h-[48px] text-base"
              placeholder="500"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-8 min-h-[48px]"
            onClick={agregar}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {items.length > 0 && (
          <ul className="space-y-2 rounded-2xl border bg-brand-tint/45 p-3">
            {items.map((item) => (
              <li key={item.categoria} className="flex items-center justify-between text-sm">
                <span>
                  {etiqueta(item.categoria)}: <b>{formatSoles(item.monto)}</b>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => quitar(item.categoria)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button
            size="xl"
            className="w-full"
            onClick={guardarYContinuar}
            disabled={loading}
          >
            {loading ? 'Guardando...' : items.length > 0 ? 'Continuar' : 'Omitir por ahora'}
          </Button>
          {items.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              className="min-h-[48px]"
              onClick={onContinuar}
              disabled={loading}
            >
              Omitir por ahora
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

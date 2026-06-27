'use client'

import { useState } from 'react'
import { WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MEDIOS_PAGO } from '@/lib/medios-pago'
import { cn } from '@/lib/utils'
import type { MedioPago } from '@/types'

interface PasoMediosPagoProps {
  onContinuar: () => void
}

export function PasoMediosPago({ onContinuar }: PasoMediosPagoProps) {
  const [seleccionados, setSeleccionados] = useState<MedioPago[]>(['efectivo'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(medio: MedioPago) {
    setSeleccionados((actual) => {
      const next = actual.includes(medio)
        ? actual.filter((m) => m !== medio)
        : [...actual, medio]
      return next.length ? next : ['efectivo']
    })
  }

  async function guardar() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/negocio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medios_pago: seleccionados }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'No se pudieron guardar tus medios de pago')
      setLoading(false)
      return
    }
    onContinuar()
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-primary ring-1 ring-primary/15">
          <WalletCards className="h-6 w-6" />
        </div>
        <CardTitle className="text-base">¿Cómo te pagan tus clientes?</CardTitle>
        <p className="text-sm text-muted-foreground">
          Marca lo que aceptas en tu negocio. Así Impulsa separa lo que entra por Yape, Plin,
          efectivo o tarjeta.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {MEDIOS_PAGO.map((medio) => {
            const activo = seleccionados.includes(medio.value)
            return (
              <button
                key={medio.value}
                type="button"
                onClick={() => toggle(medio.value)}
                className={cn(
                  'min-h-[72px] rounded-2xl border p-3 text-left transition',
                  activo
                    ? 'border-primary bg-primary/10 text-brand-dark ring-1 ring-primary/20'
                    : 'border-border bg-background text-muted-foreground'
                )}
              >
                <span className="block text-sm font-semibold">{medio.label}</span>
                <span className="mt-1 block text-xs">{medio.descripcion}</span>
              </button>
            )
          })}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button size="xl" className="w-full" onClick={guardar} disabled={loading}>
          {loading ? 'Guardando...' : 'Continuar'}
        </Button>
      </CardContent>
    </Card>
  )
}

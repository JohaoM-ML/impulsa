'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PasoContactoProps {
  onContinuar: () => void
}

export function PasoContacto({ onContinuar }: PasoContactoProps) {
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/negocio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono_wsp: telefono }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'No se pudo guardar tu WhatsApp')
      setLoading(false)
      return
    }

    onContinuar()
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageCircle className="h-6 w-6" />
        </div>
        <CardTitle className="text-base">Tu WhatsApp</CardTitle>
        <p className="text-sm text-muted-foreground">
          Con este número podrás registrar ventas escribiéndonos por WhatsApp.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telefono">Celular</Label>
            <div className="flex gap-2">
              <span className="flex min-h-[48px] items-center rounded-md border bg-muted px-3 text-sm">
                +51
              </span>
              <Input
                id="telefono"
                type="tel"
                inputMode="numeric"
                className="min-h-[48px] text-base"
                placeholder="987654321"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 9))}
                required
                autoComplete="tel"
              />
            </div>
            <p className="text-xs text-muted-foreground">9 dígitos, sin espacios.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full min-h-[48px]" disabled={loading || telefono.length < 9}>
            {loading ? 'Guardando...' : 'Continuar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

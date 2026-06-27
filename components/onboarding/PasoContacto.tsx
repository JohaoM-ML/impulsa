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
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-primary ring-1 ring-primary/15">
          <MessageCircle className="h-6 w-6" />
        </div>
        <CardTitle className="text-base">Tu WhatsApp</CardTitle>
        <p className="text-sm text-muted-foreground">
          Con este número tendrás a tu asesor por WhatsApp: registra ventas y gastos,
          consulta cómo va tu negocio y recibe consejos, todo por chat.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telefono">Celular</Label>
            <div className="flex gap-2">
              <span className="flex min-h-[48px] items-center rounded-xl border bg-brand-tint px-3 text-sm font-semibold text-brand-dark">
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

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="xl" className="w-full" disabled={loading || telefono.length < 9}>
            {loading ? 'Guardando...' : 'Continuar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

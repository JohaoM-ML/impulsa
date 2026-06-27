'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { REGLAS_PASSWORD, fuerzaPassword, passwordEsValida, reglasCumplidas } from '@/lib/password'
import { cn } from '@/lib/utils'

const COLOR_FUERZA = ['bg-muted', 'bg-destructive', 'bg-amber-500', 'bg-yellow-400', 'bg-primary']

export default function RegistroPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tocadoPassword, setTocadoPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reglas = reglasCumplidas(password)
  const fuerza = fuerzaPassword(password)
  const passwordOk = passwordEsValida(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordOk) {
      setTocadoPassword(true)
      setError('Tu contraseña no cumple los requisitos de seguridad.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient()
    const { error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const res = await fetch('/api/negocio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Error al crear el negocio')
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del negocio</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Mi bodega"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTocadoPassword(true)}
              autoComplete="new-password"
              required
            />

            {password && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        fuerza.nivel >= i ? COLOR_FUERZA[fuerza.nivel] : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
                {fuerza.label && (
                  <p className="text-xs text-muted-foreground">Seguridad: {fuerza.label}</p>
                )}
                <ul className="space-y-1">
                  {REGLAS_PASSWORD.map((r) => {
                    const ok = reglas[r.id]
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          'flex items-center gap-2 text-xs',
                          ok ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {r.label}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || (tocadoPassword && !passwordOk)}>
            {loading ? 'Creando...' : 'Registrarme'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

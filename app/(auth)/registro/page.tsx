'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, Check, Lock, Mail, Store, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      setError('Tu contraseña aún no cumple los requisitos de abajo.')
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
      setError(data.error || 'No pudimos crear tu negocio. Inténtalo otra vez.')
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-xl">Crea tu cuenta</CardTitle>
        <CardDescription>Es gratis y toma menos de un minuto.</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre de tu negocio</Label>
            <div className="relative">
              <Store
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Bodega Doña Rosa"
                required
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tucorreo@ejemplo.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTocadoPassword(true)}
                autoComplete="new-password"
                placeholder="Crea una contraseña segura"
                required
                className="pl-10"
                aria-describedby="password-reglas"
              />
            </div>

            {password && (
              <div id="password-reglas" className="space-y-2 pt-1">
                <div className="flex gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors',
                        fuerza.nivel >= i ? COLOR_FUERZA[fuerza.nivel] : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
                {fuerza.label && (
                  <p className="text-xs text-muted-foreground">Seguridad: {fuerza.label}</p>
                )}
                <ul className="grid grid-cols-1 gap-1">
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
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                            ok ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </span>
                        {r.label}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="xl"
            className="w-full"
            disabled={loading || (tocadoPassword && !passwordOk)}
          >
            {loading ? 'Creando tu cuenta...' : 'Crear mi cuenta'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

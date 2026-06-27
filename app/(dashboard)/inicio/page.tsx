'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AlertTriangle, ClipboardList, CreditCard, ShoppingCart, BarChart3, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SaludCircular } from '@/components/salud/SaludCircular'
import { ExplicacionColapsable } from '@/components/shared/ExplicacionColapsable'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { PageHeader } from '@/components/shared/PageHeader'
import { useNivel } from '@/hooks/useNivel'
import { useNegocio } from '@/hooks/useNegocio'
import { formatSoles } from '@/lib/utils'
import type { DashboardResumen } from '@/types'

function fechaHoy(): string {
  const f = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return f.charAt(0).toUpperCase() + f.slice(1)
}

export default function InicioPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { nivel, vocab, loading: loadingNivel, error: errorNivel, onboardingCompletado, recargar } = useNivel()
  const { negocio, loading: loadingNegocio } = useNegocio()
  const [resumen, setResumen] = useState<DashboardResumen | null>(null)
  const [loadingResumen, setLoadingResumen] = useState(true)
  const [errorResumen, setErrorResumen] = useState<string | null>(null)

  const cargarResumen = useCallback(async () => {
    setLoadingResumen(true)
    setErrorResumen(null)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('No se pudo cargar el dashboard')
      setResumen(await res.json())
    } catch (e) {
      setErrorResumen(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoadingResumen(false)
    }
  }, [])

  useEffect(() => {
    if (!loadingNivel && !onboardingCompletado) {
      router.replace('/onboarding')
    }
  }, [loadingNivel, onboardingCompletado, router])

  useEffect(() => {
    if (pathname === '/inicio') cargarResumen()
  }, [pathname, cargarResumen])

  if (loadingNivel || loadingNegocio || loadingResumen) {
    return <EstadoCargando mensaje="Cargando tu negocio..." />
  }

  if (errorNivel || errorResumen) {
    return (
      <EstadoError
        mensaje={errorNivel || errorResumen || 'Error'}
        onReintentar={() => {
          recargar()
          window.location.reload()
        }}
      />
    )
  }

  const indice = resumen?.indice ?? resumen?.score ?? null

  return (
    <div className="space-y-4 p-4">
      {/* Saludo */}
      <PageHeader
        eyebrow={fechaHoy()}
        title={`¡Hola, ${(negocio?.nombre ?? 'amigo').split(' ')[0]}!`}
        description="Chaski te acompaña hoy: registra, entiende y mejora tu negocio."
        action={<span className="text-3xl" aria-hidden="true">🦙</span>}
      />

      {/* Resumen de hoy */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resumen de hoy
            </p>
            <p className="text-xs text-muted-foreground">{resumen?.movimientosHoy ?? 0} mov.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">Vendiste</p>
              <p className="font-bold text-primary">{formatSoles(resumen?.totalVentasHoy ?? 0)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">{vocab('ganancia')}</p>
              <p className="font-bold text-emerald-600">{formatSoles(resumen?.gananciasHoy ?? 0)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">Más vendido hoy</p>
              <p className="text-xs font-bold leading-tight text-brand-dark">
                {resumen?.productoTopHoy
                  ? `${resumen.productoTopHoy.nombre} (${resumen.productoTopHoy.cantidad})`
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salud financiera */}
      {nivel >= 2 && indice !== null && (
        <Card className="border-0 bg-brand-dark text-white">
          <CardContent className="flex items-center gap-4 p-4">
            <SaludCircular
              indice={indice}
              size={110}
              color="#f59e0b"
              colorTexto="#ffffff"
              colorPista="rgba(255,255,255,0.15)"
            />
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Tu salud financiera
              </p>
              {(resumen?.indiceDelta ?? resumen?.scoreDelta) ? (
                <p className="flex items-center gap-1 text-sm font-medium text-emerald-300">
                  <TrendingUp className="h-4 w-4" />
                  {(resumen?.indiceDelta ?? resumen?.scoreDelta ?? 0) > 0
                    ? `+${resumen?.indiceDelta ?? resumen?.scoreDelta}`
                    : resumen?.indiceDelta ?? resumen?.scoreDelta}{' '}
                  esta semana
                </p>
              ) : null}
              {(resumen?.indiceExplicacion ?? resumen?.scoreExplicacion) ? (
                <ExplicacionColapsable
                  texto={resumen.indiceExplicacion ?? resumen.scoreExplicacion ?? ''}
                  className="mt-1 text-xs text-white/80"
                  classNameBoton="text-white"
                />
              ) : (
                <p className="mt-1 text-xs text-white/80">
                  Registra tus ventas para mejorar tu salud financiera.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-3 gap-2">
        <AccesoRapido href="/registrar" icon={<ClipboardList className="h-5 w-5" />} label="Registrar venta" />
        <AccesoRapido href="/registrar" icon={<ShoppingCart className="h-5 w-5" />} label="Registrar compra" />
        <AccesoRapido href="/mi-negocio" icon={<BarChart3 className="h-5 w-5" />} label="Ver reportes" />
      </div>

      {/* Camino al crédito */}
      <Link href="/salud">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">Tu salud financiera</p>
              <p className="text-sm text-primary">
                {nivel >= 3 ? 'Genera tu reporte para microfinancieras →' : 'Sigue registrando para mejorar tu índice →'}
              </p>
            </div>
            <span className="text-2xl">🏆</span>
          </CardContent>
        </Card>
      </Link>

      {/* Avisos */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Avisos para ti
        </p>
        <div className="space-y-2">
          {(resumen?.stockBajo ?? 0) > 0 && (
            <Link href="/mi-negocio">
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="flex items-center gap-3 p-3 text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>
                    <b>{resumen?.stockBajo}</b> {vocab('inventario_bajo')}
                  </span>
                </CardContent>
              </Card>
            </Link>
          )}
          {(resumen?.fiadosCount ?? 0) > 0 && (
            <Link href="/mi-negocio">
              <Card className="border-l-4 border-l-sky-500">
                <CardContent className="flex items-center gap-3 p-3 text-sm">
                  <CreditCard className="h-5 w-5 text-sky-500" />
                  <span>
                    {vocab('deuda_cobrar')} {formatSoles(resumen?.fiadosTotal ?? 0)} ({resumen?.fiadosCount} fiados)
                  </span>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>

      {/* Tip del día */}
      <Card className="border-primary/20 bg-brand-tint/70">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="text-2xl">🦙</span>
          <p className="text-sm">
            Tip del día: si guardas el <b>10% de lo que vendes</b>, en 3 meses tendrás un colchón
            para tu negocio.
          </p>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full min-h-[48px]"
        onClick={async () => {
          await fetch('/api/seed', { method: 'POST' })
          window.location.reload()
        }}
      >
        Cargar datos de demo
      </Button>
    </div>
  )
}

function AccesoRapido({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}>
      <Card className="h-full transition-transform active:scale-[0.98]">
        <CardContent className="flex flex-col items-center gap-2 p-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-tint text-primary ring-1 ring-primary/15">
            {icon}
          </span>
          <span className="text-xs font-medium leading-tight">{label}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

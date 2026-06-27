'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronLeft, Clock, MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HORAS_CIERRE_OPCIONES } from '@/lib/timezone'
import { toast } from '@/hooks/use-toast'
import type { ConfiguracionNegocio } from '@/types'

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<ConfiguracionNegocio | null>(null)

  useEffect(() => {
    fetch('/api/configuracion')
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'No se pudo cargar la configuración')
        }
        return res.json() as Promise<ConfiguracionNegocio>
      })
      .then(setConfig)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function guardar(cambios: Partial<ConfiguracionNegocio>) {
    if (!config) return
    setSaving(true)

    const res = await fetch('/api/configuracion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cambios),
    })

    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      toast({
        title: 'No se guardó',
        description: data.error || 'Intenta de nuevo',
        variant: 'destructive',
      })
      return
    }

    setConfig(data as ConfiguracionNegocio)
    toast({ title: 'Configuración guardada' })
  }

  if (loading) return <EstadoCargando mensaje="Cargando configuración..." />
  if (error) return <EstadoError mensaje={error} />
  if (!config) return <EstadoError mensaje="No hay configuración" />

  const sinWhatsApp = !config.telefono_wsp

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link
          href="/inicio"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-brand-tint hover:text-brand-dark"
          aria-label="Volver al inicio"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <PageHeader
        title="Configuración"
        description="Define cuándo termina tu día y recibe un resumen por WhatsApp."
      />

      {sinWhatsApp && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex gap-3 p-4">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Conecta tu WhatsApp primero</p>
              <p className="mt-1 text-amber-800">
                El resumen diario se envía al número que registraste en el onboarding.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-primary ring-1 ring-primary/15">
            <Clock className="h-6 w-6" />
          </div>
          <CardTitle className="text-base">¿A qué hora cierras?</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cuando llegue esa hora te mandamos un resumen de ventas, gastos y lo más vendido del día.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hora-cierre">Hora de cierre del día</Label>
            <Select
              value={config.hora_cierre_dia}
              onValueChange={(hora) => {
                setConfig((c) => (c ? { ...c, hora_cierre_dia: hora } : c))
                void guardar({ hora_cierre_dia: hora })
              }}
              disabled={saving}
            >
              <SelectTrigger id="hora-cierre" className="min-h-[48px] text-base">
                <SelectValue placeholder="Elige una hora" />
              </SelectTrigger>
              <SelectContent>
                {HORAS_CIERRE_OPCIONES.map((hora) => (
                  <SelectItem key={hora} value={hora} className="min-h-[44px]">
                    {hora}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Hora de Perú (Lima).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-primary ring-1 ring-primary/15">
            <Bell className="h-6 w-6" />
          </div>
          <CardTitle className="text-base">Resumen diario por WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 px-4 py-3">
            <div>
              <p className="font-medium text-brand-dark">Recibir resumen al cerrar</p>
              <p className="text-xs text-muted-foreground">
                {config.resumen_diario_activo
                  ? `Activo — te llega a las ${config.hora_cierre_dia}`
                  : 'Desactivado'}
              </p>
            </div>
            <input
              type="checkbox"
              className="h-6 w-6 rounded-md border-input accent-primary"
              checked={config.resumen_diario_activo}
              disabled={saving || sinWhatsApp}
              onChange={(e) => {
                const activo = e.target.checked
                setConfig((c) => (c ? { ...c, resumen_diario_activo: activo } : c))
                void guardar({ resumen_diario_activo: activo })
              }}
            />
          </label>
          {config.telefono_wsp && (
            <p className="mt-3 text-xs text-muted-foreground">
              Se envía al +{config.telefono_wsp.slice(0, 2)} {config.telefono_wsp.slice(2)}
            </p>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" size="xl" className="w-full" asChild disabled={saving}>
        <Link href="/inicio">Volver al inicio</Link>
      </Button>
    </div>
  )
}

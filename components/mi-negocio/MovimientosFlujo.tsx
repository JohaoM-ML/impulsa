'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, BookOpen, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { etiquetaMedioPago } from '@/lib/medios-pago'
import { formatSoles, cn } from '@/lib/utils'
import type { LibroResumen, MovimientoLibro, PeriodoFlujo, VentaConItems } from '@/types'

const ETIQUETA_PERIODO: Record<PeriodoFlujo, string> = {
  dia: 'de hoy',
  semana: 'de esta semana',
  mes: 'de este mes',
}

// Hora/fecha en horario de Lima para la lista cronológica.
function horaLima(fechaISO: string): string {
  return new Date(fechaISO).toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fechaCortaLima(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
  })
}

// Resumen legible de los items de una venta para el "Registro de ventas".
function conceptoVenta(venta: VentaConItems): string {
  const items = venta.items_venta ?? []
  if (!items.length) return 'Venta'
  const primero = items[0]
  const texto = `${primero.cantidad} ${primero.nombre_item}`
  return items.length > 1 ? `${texto} y ${items.length - 1} más` : texto
}

function FilaMovimiento({ mov }: { mov: MovimientoLibro }) {
  const esVenta = mov.tipo === 'venta'
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            esVenta ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'
          )}
        >
          {esVenta ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{mov.concepto}</p>
          <p className="text-xs text-muted-foreground">
            {fechaCortaLima(mov.fecha)} · {horaLima(mov.fecha)}
            {mov.medio_pago ? ` · ${etiquetaMedioPago(mov.medio_pago)}` : ''}
          </p>
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 whitespace-nowrap text-sm font-bold tabular-nums',
          esVenta ? 'text-emerald-600' : 'text-destructive'
        )}
      >
        {esVenta ? '+' : '−'}
        {formatSoles(mov.monto)}
      </span>
    </div>
  )
}

export function MovimientosFlujo({ periodo }: { periodo: PeriodoFlujo }) {
  const [data, setData] = useState<LibroResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch(`/api/mi-negocio/libro?periodo=${periodo}`)
      .then((r) => {
        if (!r.ok) throw new Error('fetch libro')
        return r.json()
      })
      .then((d: LibroResumen) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [periodo])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (loading) return <EstadoCargando mensaje="Cargando tus movimientos..." />
  if (error)
    return <EstadoError mensaje="No pudimos cargar tus movimientos." onReintentar={cargar} />
  if (!data) return null

  const etiqueta = ETIQUETA_PERIODO[periodo]

  return (
    <div className="space-y-4">
      {/* ── Registro de ventas ── */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-brand-dark">
              <Receipt className="h-4 w-4" /> Registro de ventas
            </p>
            <p className="text-xs text-muted-foreground">
              Tus ventas {etiqueta} ({data.ventas.length})
            </p>
          </div>

          {data.ventas.length ? (
            <div className="divide-y">
              {data.ventas.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{conceptoVenta(v)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fechaCortaLima(v.creado_en)} · {horaLima(v.creado_en)}
                      {v.medio_pago ? ` · ${etiquetaMedioPago(v.medio_pago)}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-primary">
                    {formatSoles(Number(v.total))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
              Aún no registras ventas {etiqueta}. ¡Anímate a anotar la primera!
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Libro diario ── */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-brand-dark">
              <BookOpen className="h-4 w-4" /> Libro diario
            </p>
            <p className="text-xs text-muted-foreground">
              Todo lo que entró y salió {etiqueta}, en orden.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-emerald-50/60 p-2.5">
              <p className="text-[11px] uppercase text-muted-foreground">Entró</p>
              <p className="text-base font-bold text-emerald-600">{formatSoles(data.totalEntradas)}</p>
            </div>
            <div className="rounded-xl border bg-destructive/5 p-2.5">
              <p className="text-[11px] uppercase text-muted-foreground">Salió</p>
              <p className="text-base font-bold text-destructive">{formatSoles(data.totalSalidas)}</p>
            </div>
          </div>

          {data.movimientos.length ? (
            <div>
              {data.movimientos.map((mov) => (
                <FilaMovimiento key={mov.id} mov={mov} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
              Sin movimientos {etiqueta}. Registra una venta o un gasto para empezar tu libro.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

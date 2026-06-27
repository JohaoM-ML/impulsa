'use client'

import { porcentajeNivelActual, xpParaSiguienteNivel } from '@/lib/nivel'
import { NOMBRES_NIVEL, type Nivel } from '@/lib/vocabulario'

export function BarraXP({
  nivel,
  xp,
  xpOverride,
}: {
  nivel: Nivel
  xp: number
  xpOverride?: number
}) {
  const xpActual = xpOverride ?? xp
  const pct = porcentajeNivelActual(xpActual)
  const restante = xpParaSiguienteNivel(xpActual)

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4 shadow-sm shadow-brand-dark/5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-brand-dark">Nivel {nivel} · {NOMBRES_NIVEL[nivel]}</span>
        <span className="text-muted-foreground">{xpActual} XP</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-brand-tint">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {restante > 0 && (
        <p className="text-xs text-muted-foreground">Faltan {restante} XP para el siguiente nivel</p>
      )}
    </div>
  )
}

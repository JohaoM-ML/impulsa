'use client'

import { cn } from '@/lib/utils'

export function colorPorScore(score: number): string {
  if (score >= 70) return '#16a34a' // verde
  if (score >= 40) return '#f59e0b' // ámbar
  return '#dc2626' // rojo
}

export function PymScoreCircular({
  score,
  size = 150,
  grosor = 12,
  className,
  colorTexto = 'currentColor',
  colorPista = 'rgba(148,163,184,0.25)',
  color,
}: {
  score: number
  size?: number
  grosor?: number
  className?: string
  colorTexto?: string
  colorPista?: string
  color?: string
}) {
  const valor = Math.max(0, Math.min(100, score))
  const radio = (size - grosor) / 2
  const circ = 2 * Math.PI * radio
  const offset = circ * (1 - valor / 100)
  const colorArco = color ?? colorPorScore(valor)

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radio} fill="none" stroke={colorPista} strokeWidth={grosor} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          fill="none"
          stroke={colorArco}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ color: colorTexto }}>
        <span className="text-3xl font-bold leading-none">{valor}</span>
        <span className="text-[10px] uppercase tracking-wide opacity-70">de 100</span>
      </div>
    </div>
  )
}

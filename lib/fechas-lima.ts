import type { PeriodoFlujo } from '@/types'

// Perú no usa horario de verano: el offset es siempre UTC-5.
export const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000

export function fechaLima(ms = Date.now()) {
  const d = new Date(ms + LIMA_OFFSET_MS)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date: d.getUTCDate(),
    day: d.getUTCDay(),
  }
}

export function limaStartMs(year: number, month: number, date: number): number {
  return Date.UTC(year, month, date) - LIMA_OFFSET_MS
}

export function inicioDiaLima(ms = Date.now()): number {
  const d = fechaLima(ms)
  return limaStartMs(d.year, d.month, d.date)
}

export function inicioSemanaLima(ms = Date.now()): number {
  const d = fechaLima(ms)
  const diff = d.day === 0 ? 6 : d.day - 1
  return limaStartMs(d.year, d.month, d.date - diff)
}

export function inicioMesLima(ms = Date.now()): number {
  const d = fechaLima(ms)
  return limaStartMs(d.year, d.month, 1)
}

export function inicioPeriodoActual(periodo: PeriodoFlujo): number {
  if (periodo === 'dia') return inicioDiaLima()
  if (periodo === 'semana') return inicioSemanaLima()
  return inicioMesLima()
}

export function periodoFlujoValido(value: string | null): PeriodoFlujo {
  return value === 'dia' || value === 'semana' || value === 'mes' ? value : 'semana'
}

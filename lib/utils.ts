import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSoles(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)
}

export function hoyISO(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export function inicioDiaLocal(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function finDiaLocal(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

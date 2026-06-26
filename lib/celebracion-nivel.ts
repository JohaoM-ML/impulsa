import type { Nivel } from '@/lib/vocabulario'

const STORAGE_KEY = 'impulsa_niveles_celebrados'

export function nivelesYaCelebrados(): Nivel[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((n): n is Nivel => [1, 2, 3, 4].includes(n))
  } catch {
    return []
  }
}

export function nivelYaCelebrado(nivel: Nivel): boolean {
  return nivelesYaCelebrados().includes(nivel)
}

export function marcarNivelCelebrado(nivel: Nivel) {
  if (typeof window === 'undefined') return
  const actuales = nivelesYaCelebrados()
  if (actuales.includes(nivel)) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...actuales, nivel]))
}

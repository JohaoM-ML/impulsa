import type { Nivel } from './vocabulario'

export function calcularNivel(xp: number): Nivel {
  if (xp >= 600) return 4
  if (xp >= 300) return 3
  if (xp >= 100) return 2
  return 1
}

export function xpParaSiguienteNivel(xp: number): number {
  if (xp >= 600) return 0
  if (xp >= 300) return 600 - xp
  if (xp >= 100) return 300 - xp
  return 100 - xp
}

export function porcentajeNivelActual(xp: number): number {
  if (xp >= 600) return 100
  if (xp >= 300) return ((xp - 300) / 300) * 100
  if (xp >= 100) return ((xp - 100) / 200) * 100
  return (xp / 100) * 100
}

export function umbralNivel(nivel: Nivel): number {
  const umbrales: Record<Nivel, number> = { 1: 0, 2: 100, 3: 300, 4: 600 }
  return umbrales[nivel]
}

// Validación de contraseña según estándar actual de login:
// mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.

export interface ReglaPassword {
  id: string
  label: string
  cumple: (pwd: string) => boolean
}

export const REGLAS_PASSWORD: ReglaPassword[] = [
  { id: 'longitud', label: 'Al menos 8 caracteres', cumple: (p) => p.length >= 8 },
  { id: 'mayuscula', label: 'Una letra mayúscula', cumple: (p) => /[A-Z]/.test(p) },
  { id: 'minuscula', label: 'Una letra minúscula', cumple: (p) => /[a-z]/.test(p) },
  { id: 'numero', label: 'Un número', cumple: (p) => /[0-9]/.test(p) },
  { id: 'simbolo', label: 'Un símbolo (!@#$...)', cumple: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function reglasCumplidas(password: string): Record<string, boolean> {
  return Object.fromEntries(REGLAS_PASSWORD.map((r) => [r.id, r.cumple(password)]))
}

export function passwordEsValida(password: string): boolean {
  return REGLAS_PASSWORD.every((r) => r.cumple(password))
}

// Devuelve 0..4 (cuántas categorías de fuerza cumple, sin contar longitud mínima como categoría extra).
export function fuerzaPassword(password: string): { nivel: 0 | 1 | 2 | 3 | 4; label: string } {
  const cumplidas = REGLAS_PASSWORD.filter((r) => r.cumple(password)).length
  if (!password) return { nivel: 0, label: '' }
  if (cumplidas <= 2) return { nivel: 1, label: 'Débil' }
  if (cumplidas === 3) return { nivel: 2, label: 'Regular' }
  if (cumplidas === 4) return { nivel: 3, label: 'Buena' }
  return { nivel: 4, label: 'Fuerte' }
}

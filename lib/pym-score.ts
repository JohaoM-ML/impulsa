// Categorías de gasto consideradas FIJAS (mensuales). Se prorratean /4 para
// no hundir el score de una semana solo porque tocó pagar el alquiler.
export const CATEGORIAS_FIJAS = [
  'alquiler',
  'renta',
  'local',
  'servicios',
  'luz',
  'agua',
  'internet',
  'telefono',
  'teléfono',
  'sueldos',
  'sueldo',
  'planilla',
  'personal',
  'fijo',
]

export function esGastoFijo(categoria?: string | null): boolean {
  if (!categoria) return false
  const c = categoria.trim().toLowerCase()
  return CATEGORIAS_FIJAS.some((f) => c.includes(f))
}

/**
 * Separa una lista de gastos en variables (semanales) y fijos (mensuales),
 * y devuelve el gasto efectivo de la semana prorrateando los fijos /4.
 */
export function gastosEfectivosSemana(
  gastos: { monto: number; categoria?: string | null }[]
): { gastosVariables: number; gastosFijosMensuales: number; gastosEfectivos: number } {
  let gastosVariables = 0
  let gastosFijosMensuales = 0

  for (const g of gastos) {
    const monto = Number(g.monto) || 0
    if (esGastoFijo(g.categoria)) gastosFijosMensuales += monto
    else gastosVariables += monto
  }

  const gastosEfectivos = gastosVariables + gastosFijosMensuales / 4
  return { gastosVariables, gastosFijosMensuales, gastosEfectivos }
}

export function calcularPymScore(params: {
  ventas: number
  gastos: number
  deudaTotal?: number
}): { score: number; margen: number } {
  const { ventas, gastos, deudaTotal = 0 } = params

  if (ventas <= 0) {
    return { score: 30, margen: 0 }
  }

  const margen = ((ventas - gastos) / ventas) * 100
  let score = 50

  if (margen >= 30) score += 30
  else if (margen >= 15) score += 20
  else if (margen >= 5) score += 10
  else score -= 10

  if (ventas >= 5000) score += 10
  else if (ventas >= 2000) score += 5

  if (gastos > ventas) score -= 20

  // El fiado (cuentas por cobrar) penaliza: dinero vendido que aún no entra.
  const ratioDeuda = deudaTotal / ventas
  if (ratioDeuda > 0.5) score -= 15
  else if (ratioDeuda > 0.25) score -= 8

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    margen: Math.round(margen * 10) / 10,
  }
}

export interface ComponentesScore {
  regularidad: number
  estabilidad: number
  manejo_deudas: number
  antiguedad: number
}

/**
 * Desglosa el PymScore en sus 4 pilares (cada uno 0-100) para mostrar en
 * "Cómo se compone tu score".
 */
export function calcularComponentes(params: {
  margen: number
  ratioDeuda: number
  diasActivos: number
  diasPeriodo: number
  antiguedadMeses: number
}): ComponentesScore {
  const { margen, ratioDeuda, diasActivos, diasPeriodo, antiguedadMeses } = params

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

  const regularidad = clamp(diasPeriodo > 0 ? (diasActivos / diasPeriodo) * 100 : 0)
  // Margen 0% -> 50, 30%+ -> ~95.
  const estabilidad = clamp(50 + margen * 1.5)
  const manejo_deudas = clamp(100 - ratioDeuda * 100)
  // 12 meses o más = 100.
  const antiguedad = clamp((antiguedadMeses / 12) * 100)

  return { regularidad, estabilidad, manejo_deudas, antiguedad }
}

export function inicioSemana(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

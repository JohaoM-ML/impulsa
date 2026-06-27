// Categorías de gasto consideradas FIJAS (mensuales). Se prorratean /4 para
// no hundir el índice de una semana solo porque tocó pagar el alquiler.
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

export interface ComponentesSalud {
  rentabilidad: number
  liquidez: number
  deudas: number
  consistencia: number
  crecimiento: number
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** Sin gastos fijos registrados → 50 (neutro, no infla el ISF). */
export function pilarLiquidez(cobertura: number | null): number {
  if (cobertura === null) return 50
  if (cobertura >= 2) return 100
  if (cobertura >= 1) return 50
  return clamp(cobertura * 50)
}

/** Sin periodo anterior → 50 (neutro). */
export function pilarCrecimiento(variacion: number | null): number {
  if (variacion === null) return 50
  return clamp(50 + variacion * 50)
}

/**
 * Índice de Salud Financiera (ISF) — modelo ponderado de 5 pilares, 0–100.
 * ISF = 0.30·rentabilidad + 0.25·liquidez + 0.20·deudas + 0.15·consistencia + 0.10·crecimiento
 */
export function calcularIndiceSalud(params: {
  ventas: number
  gastos: number
  ratioDeuda: number
  diasActivos: number
  diasPeriodo: number
  coberturaLiquidez: number | null
  variacionVentas: number | null
}): { indice: number; margen: number; componentes: ComponentesSalud } {
  const { ventas, gastos, ratioDeuda, diasActivos, diasPeriodo, coberturaLiquidez, variacionVentas } =
    params

  if (ventas <= 0) {
    return {
      indice: 30,
      margen: 0,
      componentes: {
        rentabilidad: 30,
        liquidez: pilarLiquidez(coberturaLiquidez),
        deudas: clamp(100 - ratioDeuda * 100),
        consistencia: clamp(diasPeriodo > 0 ? (diasActivos / diasPeriodo) * 100 : 0),
        crecimiento: pilarCrecimiento(variacionVentas),
      },
    }
  }

  const margen = ((ventas - gastos) / ventas) * 100
  const rentabilidad = clamp(50 + margen * 1.5)
  const liquidez = pilarLiquidez(coberturaLiquidez)
  const deudas = clamp(100 - ratioDeuda * 100)
  const consistencia = clamp(diasPeriodo > 0 ? (diasActivos / diasPeriodo) * 100 : 0)
  const crecimiento = pilarCrecimiento(variacionVentas)

  const indice = clamp(
    0.3 * rentabilidad + 0.25 * liquidez + 0.2 * deudas + 0.15 * consistencia + 0.1 * crecimiento
  )

  return {
    indice,
    margen: Math.round(margen * 10) / 10,
    componentes: { rentabilidad, liquidez, deudas, consistencia, crecimiento },
  }
}

export function inicioSemana(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export function inicioSemanaAnterior(): string {
  const d = new Date(inicioSemana() + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

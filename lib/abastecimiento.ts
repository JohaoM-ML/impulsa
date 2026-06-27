const MS_DIA = 24 * 60 * 60 * 1000

export const PERIODOS_ABASTECIMIENTO = ['7d', '30d', '90d'] as const
export type PeriodoAbastecimiento = (typeof PERIODOS_ABASTECIMIENTO)[number]

export function inicioPeriodo(periodo: string): string | null {
  switch (periodo) {
    case '7d':
      return new Date(Date.now() - 7 * MS_DIA).toISOString()
    case '90d':
      return new Date(Date.now() - 90 * MS_DIA).toISOString()
    case 'todo':
      return null
    default:
      return new Date(Date.now() - 30 * MS_DIA).toISOString()
  }
}

export function etiquetaPeriodo(periodo: string): string {
  switch (periodo) {
    case '7d':
      return '7 días'
    case '90d':
      return '90 días'
    case 'todo':
      return 'todo el historial'
    default:
      return '30 días'
  }
}

export function normalizarNombre(nombre: string): string {
  return nombre.trim().toLowerCase()
}

/** Cubre ventas del periodo o 2× stock mínimo, menos lo que tienes hoy. */
export function sugerenciaPedido(
  stockActual: number,
  stockMinimo: number,
  cantidadVendida: number
): number {
  const objetivo = Math.max(stockMinimo * 2, cantidadVendida)
  return Math.max(0, Math.ceil(objetivo - stockActual))
}

export function costoUnitarioEstimado(
  precioCompra: number | null | undefined,
  precioVenta: number | null | undefined
): number {
  if (precioCompra != null) return Number(precioCompra)
  if (precioVenta != null) return Number(precioVenta) * 0.65
  return 0
}

export function costoEstimado(
  sugerencia: number,
  precioCompra: number | null | undefined,
  precioVenta: number | null | undefined
): number {
  return Math.round(sugerencia * costoUnitarioEstimado(precioCompra, precioVenta) * 100) / 100
}

import type { MedioPago } from '@/types'

export const MEDIOS_PAGO: Array<{ value: MedioPago; label: string; descripcion: string }> = [
  { value: 'efectivo', label: 'Efectivo', descripcion: 'Billetes y monedas' },
  { value: 'yape', label: 'Yape', descripcion: 'Billetera digital' },
  { value: 'plin', label: 'Plin', descripcion: 'Billetera digital' },
  { value: 'tarjeta', label: 'Tarjeta', descripcion: 'POS o link de pago' },
]

export function esMedioPago(valor: unknown): valor is MedioPago {
  return typeof valor === 'string' && MEDIOS_PAGO.some((m) => m.value === valor)
}

export function normalizarMediosPago(valores: unknown): MedioPago[] {
  if (!Array.isArray(valores)) return ['efectivo']
  const limpios = valores.filter(esMedioPago)
  return limpios.length ? Array.from(new Set(limpios)) : ['efectivo']
}

export function etiquetaMedioPago(valor: MedioPago | string | null | undefined): string {
  return MEDIOS_PAGO.find((m) => m.value === valor)?.label ?? 'Efectivo'
}

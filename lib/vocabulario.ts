export const VOCABULARIO = {
  ganancia: {
    1: 'cuánto ganaste',
    2: 'ganancia neta',
    3: 'margen de utilidad',
    4: 'margen de contribución',
  },
  flujo_caja: {
    1: 'cuánto dinero tienes',
    2: 'saldo disponible',
    3: 'flujo de caja',
    4: 'flujo de caja operativo',
  },
  inventario_bajo: {
    1: 'se te está acabando',
    2: 'stock bajo',
    3: 'inventario crítico',
    4: 'punto de reorden alcanzado',
  },
  deuda_cobrar: {
    1: 'te deben',
    2: 'cuentas por cobrar',
    3: 'cartera de clientes',
    4: 'cuentas por cobrar corrientes',
  },
  gasto: {
    1: 'lo que gastas',
    2: 'tus gastos',
    3: 'egresos',
    4: 'costos operativos',
  },
  ventas_hoy: {
    1: 'ventas de hoy',
    2: 'ventas del día',
    3: 'transacciones diarias',
    4: 'volumen de ventas diario',
  },
  salud_financiera: {
    1: 'la salud de tu negocio',
    2: 'tu salud financiera',
    3: 'tu índice de salud financiera',
    4: 'tu índice de salud financiera (ISF)',
  },
} as const

export type VocabKey = keyof typeof VOCABULARIO
export type Nivel = 1 | 2 | 3 | 4

export function vocab(key: VocabKey, nivel: Nivel): string {
  return VOCABULARIO[key][nivel]
}

export const NOMBRES_NIVEL: Record<Nivel, string> = {
  1: 'Bodeguero',
  2: 'Emprendedor',
  3: 'Comerciante',
  4: 'Empresario',
}

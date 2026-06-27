export type Nivel = 1 | 2 | 3 | 4

export interface ItemVenta {
  id?: string
  venta_id?: string
  producto_id?: string | null
  nombre_item: string
  cantidad: number
  precio_unit: number
  subtotal: number
}

export interface Venta {
  id: string
  negocio_id: string
  cliente_id?: string | null
  total: number
  canal: string
  estado: string
  notas?: string | null
  creado_en: string
}

export interface VentaConItems extends Venta {
  items_venta: ItemVenta[]
}

export interface Negocio {
  id: string
  user_id: string
  nombre: string
  rubro?: string | null
  telefono_wsp?: string | null
  creado_en: string
}

export interface Producto {
  id: string
  negocio_id: string
  nombre: string
  categoria?: string | null
  unidad: string
  stock_actual: number
  stock_minimo: number
  precio_compra?: number | null
  precio_venta?: number | null
  codigo_barras?: string | null
  activo: boolean
  actualizado_en: string
}

export interface Proveedor {
  id: string
  negocio_id: string
  nombre: string
  telefono?: string | null
  deuda_total: number
}

export interface Cliente {
  id: string
  negocio_id: string
  nombre: string
  telefono?: string | null
  deuda_total: number
  creado_en: string
}

export interface Gasto {
  id: string
  negocio_id: string
  descripcion: string
  monto: number
  categoria?: string | null
  creado_en: string
}

export type CategoriaGastoFijo = 'alquiler' | 'luz' | 'agua' | 'internet' | 'sueldos' | 'otro'

export interface GastoFijo {
  id: string
  negocio_id: string
  categoria: CategoriaGastoFijo
  descripcion?: string | null
  monto: number
  dia_pago?: number | null
  activo: boolean
  creado_en: string
}

export interface ProgresoUsuario {
  id: string
  user_id: string
  negocio_id?: string | null
  nivel: number
  xp_total: number
  onboarding_completado: boolean
  ultimo_acceso?: string | null
  creado_en: string
}

export interface OpcionOnboarding {
  id: string
  texto: string
  xp: number
}

export interface PreguntaOnboarding {
  id: string
  pregunta: string
  opciones: OpcionOnboarding[]
  orden?: number | null
}

export interface ComponentesSalud {
  rentabilidad?: number
  liquidez?: number
  deudas?: number
  consistencia?: number
  crecimiento?: number
}

export interface SaludFinanciera {
  id: string
  negocio_id: string
  semana: string
  indice: number
  ventas_semana?: number | null
  gastos_semana?: number | null
  margen?: number | null
  explicacion?: string | null
  componentes?: ComponentesSalud | null
  creado_en: string
}

/** @deprecated Usar SaludFinanciera */
export type ComponentesPymScore = ComponentesSalud
/** @deprecated Usar SaludFinanciera */
export interface PymScore extends Omit<SaludFinanciera, 'indice'> {
  score: number
}

export interface DashboardResumen {
  gananciaHoy: number
  ventasHoy: number
  totalVentasHoy: number
  gananciasHoy: number
  gastoHoy: number
  teQueda: number
  movimientosHoy: number
  productoTopHoy: { nombre: string; cantidad: number } | null
  stockBajo: number
  indice: number | null
  indiceDelta: number
  indiceExplicacion: string | null
  /** @deprecated usar indice */
  score: number | null
  /** @deprecated usar indiceDelta */
  scoreDelta: number
  /** @deprecated usar indiceExplicacion */
  scoreExplicacion: string | null
  fiadosCount: number
  fiadosTotal: number
  ventasSemana: { dia: string; total: number }[]
}

export interface OCRProductoDetectado {
  nombre: string
  cantidad: number
  precio_unit?: number
}

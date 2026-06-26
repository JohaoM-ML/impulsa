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

export interface ComponentesPymScore {
  regularidad?: number
  estabilidad?: number
  manejo_deudas?: number
  antiguedad?: number
}

export interface PymScore {
  id: string
  negocio_id: string
  semana: string
  score: number
  ventas_semana?: number | null
  gastos_semana?: number | null
  margen?: number | null
  explicacion?: string | null
  componentes?: ComponentesPymScore | null
  creado_en: string
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
  score: number | null
  scoreDelta: number
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

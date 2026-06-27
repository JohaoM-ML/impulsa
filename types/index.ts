export type Nivel = 1 | 2 | 3 | 4
export type MedioPago = 'efectivo' | 'yape' | 'plin' | 'tarjeta'

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
  medio_pago: MedioPago
  comprobante_url?: string | null
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
  medios_pago?: MedioPago[]
  hora_cierre_dia?: string
  resumen_diario_activo?: boolean
  ultimo_resumen_enviado?: string | null
  ultimo_pedido_enviado?: string | null
  creado_en: string
}

export interface ConfiguracionNegocio {
  hora_cierre_dia: string
  resumen_diario_activo: boolean
  telefono_wsp: string | null
  medios_pago?: MedioPago[]
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
  proveedor_id?: string | null
  unidad_compra?: string | null
  factor_compra?: number | null
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
  dia_visita?: number | null
  frecuencia_dias?: number | null
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
  tutorial_visto: boolean
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

export interface FlujoSemana {
  semana: string
  ventas: number
  yape?: number
  plin?: number
  efectivo?: number
  tarjeta?: number
  costoMercaderia: number
  gananciaBruta: number
  gastosFijos: number
  gananciaNeta: number
  gastos: number
}

export type DiagnosticoFlujo = 'margen' | 'costos_fijos' | 'positivo' | 'sin_datos'

export type PeriodoFlujo = 'dia' | 'semana' | 'mes'

export interface FlujoResumen {
  periodo: PeriodoFlujo
  etiquetaPeriodo: string
  serie: FlujoSemana[]
  totalVentas: number
  costoMercaderia: number
  gananciaBruta: number
  gastosFijos: number
  gananciaNeta: number
  diagnostico: DiagnosticoFlujo
  tieneGastosFijos: boolean
  /** Total de gastos fijos al mes (alquiler, luz, etc.), según la configuración del negocio. */
  gastoFijoMensual: number
  /** Parte del periodo seleccionado. Se conserva el nombre por compatibilidad con vistas existentes. */
  gastoFijoSemanal: number
  comparacion: {
    ventas: number
    gastos: number
    ganancia: number
    gananciaAnterior: number
    delta: number
  }
  totalGastos: number
  totalCosto: number
  totalGastosRegistrados: number
  porMedioPago?: Record<MedioPago, number>
}

export interface MovimientoLibro {
  id: string
  tipo: 'venta' | 'gasto'
  /** creado_en del registro original */
  fecha: string
  /** Resumen de items de la venta o descripción del gasto */
  concepto: string
  /** Siempre positivo; el tipo indica si entra (venta) o sale (gasto) */
  monto: number
  medio_pago?: MedioPago | null
}

export interface LibroResumen {
  periodo: PeriodoFlujo
  /** Ventas del periodo, para la sección "Registro de ventas" */
  ventas: VentaConItems[]
  /** Ventas y gastos del periodo en orden cronológico, para el "Libro diario" */
  movimientos: MovimientoLibro[]
  totalEntradas: number
  totalSalidas: number
}

export interface OCRProductoDetectado {
  nombre: string
  cantidad: number
  precio_unit?: number
}

export interface ComprobantePagoDetectado {
  monto: number | null
  medio_pago: MedioPago | null
  operacion?: string | null
  fecha?: string | null
  texto?: string
}

export interface TopProductoItem {
  id: string | null
  nombre: string
  cantidad: number
  ingresos: number
  stock_actual: number
  stock_minimo: number
  unidad: string
  categoria: string | null
  sugerencia_pedido: number
  stock_bajo: boolean
}

export interface TopResumen {
  porCantidad: TopProductoItem[]
  porIngresos: TopProductoItem[]
  sinVentas: TopProductoItem[]
  masRentables: { nombre: string; margen: number }[]
  categorias: string[]
  periodo: string
}

export interface AbastecimientoItem {
  id: string
  nombre: string
  unidad: string
  categoria: string | null
  stock_actual: number
  stock_minimo: number
  vendido_periodo: number
  sugerencia_pedido: number
  costo_estimado: number
  stock_bajo: boolean
}

export interface AbastecimientoResumen {
  periodo: string
  productos_stock_bajo: number
  productos_a_reabastecer: number
  unidades_sugeridas: number
  costo_estimado_total: number
  productos: AbastecimientoItem[]
}

export type ClasificacionCompra = 'pedir' | 'opcional' | 'no_pedir'
export type TipoPatronCompra =
  | 'quiebre_stock'
  | 'capital_muerto'
  | 'producto_estrella'
  | 'caida_ventas'
  | 'compra_conjunta'
  | 'estacionalidad'

export interface CompraInteligenteProducto {
  id: string
  nombre: string
  categoria: string | null
  proveedor_id: string | null
  proveedor_nombre: string
  unidad: string
  unidad_compra: string | null
  factor_compra: number
  stock_actual: number
  stock_minimo: number
  precio_compra: number | null
  precio_venta: number | null
  vendido_periodo: number
  velocidad_venta: number
  dias_cobertura: number | null
  dias_hasta_visita: number
  stock_seguridad: number
  cantidad_pedir: number
  costo_estimado: number
  clasificacion: ClasificacionCompra
  motivo: string
}

export interface CompraInteligentePatron {
  tipo: TipoPatronCompra
  titulo: string
  descripcion: string
  producto_id?: string
  productos?: string[]
  severidad: 'alta' | 'media' | 'baja'
}

export interface CompraInteligenteProveedor {
  id: string
  nombre: string
  dia_visita: number | null
  frecuencia_dias: number
}

export interface CompraInteligenteResumen {
  grupos: {
    pedir: CompraInteligenteProducto[]
    opcional: CompraInteligenteProducto[]
    noPedir: CompraInteligenteProducto[]
  }
  consejos: string[]
  patrones: CompraInteligentePatron[]
  proveedores: CompraInteligenteProveedor[]
  mensajeChaski: string
}

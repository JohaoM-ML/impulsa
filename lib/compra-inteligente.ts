import { costoEstimado } from '@/lib/abastecimiento'
import type {
  ClasificacionCompra,
  CompraInteligentePatron,
  CompraInteligenteProducto,
} from '@/types'

const DIAS_ANALISIS = 28
const COLCHON_SEGURIDAD_DIAS = 2

export interface ProductoCompraInput {
  id: string
  nombre: string
  categoria: string | null
  proveedor_id: string | null
  proveedor_nombre: string
  dia_visita: number | null
  frecuencia_dias: number
  unidad: string
  unidad_compra: string | null
  factor_compra: number | null
  stock_actual: number
  stock_minimo: number
  precio_compra: number | null
  precio_venta: number | null
}

export interface VentaProductoInput {
  producto_id: string | null
  nombre_item: string
  cantidad: number
  venta_id: string
  creado_en: string
}

export interface VentasProductoResumen {
  productoId: string
  cantidadPeriodo: number
  cantidadUltimos14: number
  cantidadPrevios14: number
}

export function redondear2(n: number): number {
  return Math.round(n * 100) / 100
}

function normalizarNumero(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Number(n) || 0)
}

export function velocidadVenta(unidadesVendidas: number, dias: number): number {
  if (dias <= 0) return 0
  return redondear2(normalizarNumero(unidadesVendidas) / dias)
}

export function diasCobertura(stockActual: number, velocidad: number): number | null {
  const stock = normalizarNumero(stockActual)
  if (velocidad <= 0) return null
  return redondear2(stock / velocidad)
}

export function diasHastaVisita(
  diaVisita: number | null,
  hoy: Date = new Date(),
  frecuenciaDias = 7
): number {
  if (diaVisita === null || diaVisita < 0 || diaVisita > 6) return 1
  const diff = (diaVisita - hoy.getDay() + 7) % 7
  return diff === 0 ? Math.max(1, frecuenciaDias) : diff
}

export function redondearAUnidadCompra(cantidad: number, factorCompra: number | null): number {
  const factor = factorCompra && factorCompra > 1 ? factorCompra : 1
  return Math.ceil(Math.max(0, cantidad) / factor) * factor
}

export function calcularCantidadPedir(params: {
  stockActual: number
  velocidad: number
  diasHastaVisita: number
  stockSeguridad: number
  factorCompra: number | null
}): number {
  if (params.velocidad <= 0) return 0
  const objetivo = params.velocidad * params.diasHastaVisita + params.stockSeguridad
  const deficit = objetivo - normalizarNumero(params.stockActual)
  if (deficit <= 0) return 0
  return redondearAUnidadCompra(deficit, params.factorCompra)
}

export function clasificarProducto(params: {
  stockActual: number
  velocidad: number
  diasCobertura: number | null
  diasHastaVisita: number
  cantidadPedir: number
}): { clasificacion: ClasificacionCompra; motivo: string } {
  if (params.velocidad <= 0) {
    return {
      clasificacion: 'no_pedir',
      motivo: 'No tuvo ventas recientes; evita guardar plata en stock quieto.',
    }
  }

  if (normalizarNumero(params.stockActual) <= 0) {
    return {
      clasificacion: 'pedir',
      motivo: 'Ya está en cero y sí tiene movimiento.',
    }
  }

  const cobertura = params.diasCobertura ?? Number.POSITIVE_INFINITY
  if (cobertura <= params.diasHastaVisita || params.cantidadPedir > 0 && cobertura <= params.diasHastaVisita + 1) {
    return {
      clasificacion: 'pedir',
      motivo: 'Se puede acabar antes de la próxima visita del proveedor.',
    }
  }

  if (cobertura <= params.diasHastaVisita + COLCHON_SEGURIDAD_DIAS) {
    return {
      clasificacion: 'opcional',
      motivo: 'Aguanta justo, pero conviene tener un colchón pequeño.',
    }
  }

  return {
    clasificacion: 'no_pedir',
    motivo: 'Tienes stock suficiente para los próximos días.',
  }
}

export function ventasPorProducto(
  ventas: VentaProductoInput[],
  productos: Pick<ProductoCompraInput, 'id' | 'nombre'>[],
  hoy: Date = new Date()
): Map<string, VentasProductoResumen> {
  const porNombre = new Map(productos.map((p) => [p.nombre.trim().toLowerCase(), p.id]))
  const inicioUltimos14 = hoy.getTime() - 14 * 24 * 60 * 60 * 1000

  const mapa = new Map<string, VentasProductoResumen>()
  for (const venta of ventas) {
    const productoId =
      venta.producto_id ?? porNombre.get(venta.nombre_item.trim().toLowerCase()) ?? null
    if (!productoId) continue

    const previo = mapa.get(productoId) ?? {
      productoId,
      cantidadPeriodo: 0,
      cantidadUltimos14: 0,
      cantidadPrevios14: 0,
    }
    const cantidad = normalizarNumero(venta.cantidad)
    previo.cantidadPeriodo += cantidad
    if (new Date(venta.creado_en).getTime() >= inicioUltimos14) {
      previo.cantidadUltimos14 += cantidad
    } else {
      previo.cantidadPrevios14 += cantidad
    }
    mapa.set(productoId, previo)
  }
  return mapa
}

export function analizarProductoCompra(
  producto: ProductoCompraInput,
  ventas: VentasProductoResumen | undefined,
  hoy: Date = new Date()
): CompraInteligenteProducto {
  const vendidoPeriodo = redondear2(ventas?.cantidadPeriodo ?? 0)
  const velocidad = velocidadVenta(vendidoPeriodo, DIAS_ANALISIS)
  const cobertura = diasCobertura(producto.stock_actual, velocidad)
  const hastaVisita = diasHastaVisita(producto.dia_visita, hoy, producto.frecuencia_dias)
  const stockSeguridad = Math.max(normalizarNumero(producto.stock_minimo), velocidad * COLCHON_SEGURIDAD_DIAS)
  const cantidadPedir = calcularCantidadPedir({
    stockActual: producto.stock_actual,
    velocidad,
    diasHastaVisita: hastaVisita,
    stockSeguridad,
    factorCompra: producto.factor_compra,
  })
  const { clasificacion, motivo } = clasificarProducto({
    stockActual: producto.stock_actual,
    velocidad,
    diasCobertura: cobertura,
    diasHastaVisita: hastaVisita,
    cantidadPedir,
  })

  return {
    id: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    proveedor_id: producto.proveedor_id,
    proveedor_nombre: producto.proveedor_nombre,
    unidad: producto.unidad,
    unidad_compra: producto.unidad_compra,
    factor_compra: producto.factor_compra && producto.factor_compra > 0 ? producto.factor_compra : 1,
    stock_actual: normalizarNumero(producto.stock_actual),
    stock_minimo: normalizarNumero(producto.stock_minimo),
    precio_compra: producto.precio_compra,
    precio_venta: producto.precio_venta,
    vendido_periodo: vendidoPeriodo,
    velocidad_venta: velocidad,
    dias_cobertura: cobertura,
    dias_hasta_visita: hastaVisita,
    stock_seguridad: redondear2(stockSeguridad),
    cantidad_pedir: cantidadPedir,
    costo_estimado: costoEstimado(cantidadPedir, producto.precio_compra, producto.precio_venta),
    clasificacion,
    motivo,
  }
}

export function detectarPatrones(
  recomendaciones: CompraInteligenteProducto[],
  ventasResumen: Map<string, VentasProductoResumen>,
  ventasItems: VentaProductoInput[]
): CompraInteligentePatron[] {
  const patrones: CompraInteligentePatron[] = []
  const porId = new Map(recomendaciones.map((p) => [p.id, p]))

  const quiebres = recomendaciones.filter((p) => p.stock_actual <= 0 && p.velocidad_venta > 0)
  for (const p of quiebres.slice(0, 3)) {
    patrones.push({
      tipo: 'quiebre_stock',
      titulo: 'Quiebre de stock',
      descripcion: `${p.nombre} vende, pero está en cero o casi en cero.`,
      producto_id: p.id,
      severidad: 'alta',
    })
  }

  const capitalMuerto = recomendaciones
    .filter((p) => p.stock_actual > p.stock_minimo * 3 && p.velocidad_venta < 0.15)
    .sort((a, b) => b.stock_actual - a.stock_actual)
  for (const p of capitalMuerto.slice(0, 3)) {
    patrones.push({
      tipo: 'capital_muerto',
      titulo: 'Capital quieto',
      descripcion: `${p.nombre} tiene bastante stock y se mueve poco.`,
      producto_id: p.id,
      severidad: 'media',
    })
  }

  const estrella = [...recomendaciones].sort((a, b) => b.velocidad_venta - a.velocidad_venta)[0]
  if (estrella && estrella.velocidad_venta > 0) {
    patrones.push({
      tipo: 'producto_estrella',
      titulo: 'Producto estrella',
      descripcion: `${estrella.nombre} es el producto que más rota.`,
      producto_id: estrella.id,
      severidad: 'baja',
    })
  }

  const caidas = recomendaciones
    .map((p) => {
      const ventas = ventasResumen.get(p.id)
      const ultimos = ventas?.cantidadUltimos14 ?? 0
      const previos = ventas?.cantidadPrevios14 ?? 0
      return { producto: p, ultimos, previos }
    })
    .filter((x) => x.previos >= 4 && x.ultimos <= x.previos * 0.5)
    .sort((a, b) => b.previos - a.previos)

  for (const c of caidas.slice(0, 2)) {
    patrones.push({
      tipo: 'caida_ventas',
      titulo: 'Caída de ventas',
      descripcion: `${c.producto.nombre} vendió menos que las semanas anteriores.`,
      producto_id: c.producto.id,
      severidad: 'media',
    })
  }

  const pares = detectarComprasJuntas(ventasItems, porId)
  if (pares.length) {
    patrones.push({
      tipo: 'compra_conjunta',
      titulo: 'Se compran juntos',
      descripcion: `${pares[0].productos.join(' + ')} suelen salir en la misma venta.`,
      productos: pares[0].productos,
      severidad: 'baja',
    })
  }

  // TODO: cuando exista más historial por fechas especiales, ajustar por campañas,
  // fin de mes o fiestas. Por ahora dejamos el hook explícito sin alterar números.
  const dia = new Date().getDate()
  if (dia >= 25) {
    patrones.push({
      tipo: 'estacionalidad',
      titulo: 'Fin de mes cerca',
      descripcion: 'Revisa básicos de alta rotación antes del fin de mes.',
      severidad: 'baja',
    })
  }

  return patrones
}

function detectarComprasJuntas(
  ventasItems: VentaProductoInput[],
  productosPorId: Map<string, CompraInteligenteProducto>
): Array<{ productos: string[]; veces: number }> {
  const porVenta = new Map<string, string[]>()
  for (const item of ventasItems) {
    if (!item.producto_id || !productosPorId.has(item.producto_id)) continue
    const lista = porVenta.get(item.venta_id) ?? []
    if (!lista.includes(item.producto_id)) lista.push(item.producto_id)
    porVenta.set(item.venta_id, lista)
  }

  const conteo = new Map<string, number>()
  for (const ids of Array.from(porVenta.values())) {
    if (ids.length < 2) continue
    const ordenados = [...ids].sort()
    for (let i = 0; i < ordenados.length; i++) {
      for (let j = i + 1; j < ordenados.length; j++) {
        const key = `${ordenados[i]}::${ordenados[j]}`
        conteo.set(key, (conteo.get(key) ?? 0) + 1)
      }
    }
  }

  return Array.from(conteo.entries())
    .filter(([, veces]) => veces >= 2)
    .map(([key, veces]) => {
      const nombres = key
        .split('::')
        .map((id) => productosPorId.get(id)?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre))
      return { productos: nombres, veces }
    })
    .filter((p) => p.productos.length === 2)
    .sort((a, b) => b.veces - a.veces)
}

export function analizarCompraInteligente(
  productos: ProductoCompraInput[],
  ventas: VentaProductoInput[],
  hoy: Date = new Date()
): {
  recomendaciones: CompraInteligenteProducto[]
  patrones: CompraInteligentePatron[]
  consejos: string[]
} {
  const ventasResumen = ventasPorProducto(ventas, productos, hoy)
  const recomendaciones = productos
    .map((producto) => analizarProductoCompra(producto, ventasResumen.get(producto.id), hoy))
    .sort((a, b) => {
      const prioridad = { pedir: 0, opcional: 1, no_pedir: 2 } satisfies Record<ClasificacionCompra, number>
      if (prioridad[a.clasificacion] !== prioridad[b.clasificacion]) {
        return prioridad[a.clasificacion] - prioridad[b.clasificacion]
      }
      return b.velocidad_venta - a.velocidad_venta
    })

  const patrones = detectarPatrones(recomendaciones, ventasResumen, ventas)
  const consejos = patrones
    .filter((p) => p.tipo !== 'estacionalidad')
    .slice(0, 2)
    .map((p) => p.descripcion)

  return { recomendaciones, patrones, consejos }
}

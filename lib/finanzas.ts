// Modelo financiero central de Impulsa.
// Separa el costo de la mercadería vendida (COGS, variable) de los gastos fijos
// del periodo, para distinguir "lo que dejó la venta" (ganancia bruta) de
// "lo que quedó al final" (ganancia neta).

/** Cuando no hay precio_compra registrado, se asume que la mercadería costó el 65% del precio de venta. */
export const FACTOR_COSTO_ESTIMADO = 0.65

export interface ItemVentaCosto {
  cantidad: number
  precio_unit: number
  productos:
    | { precio_compra: number | null }
    | { precio_compra: number | null }[]
    | null
}

export interface VentaConCosto {
  items_venta?: ItemVentaCosto[]
}

/** Costo de la mercadería vendida (COGS) de una sola venta. */
export function costoDeVenta(venta: VentaConCosto): number {
  const items = venta.items_venta ?? []
  return items.reduce((s, it) => {
    const prod = Array.isArray(it.productos) ? it.productos[0] : it.productos
    const precioVenta = Number(it.precio_unit)
    const costo =
      prod?.precio_compra != null
        ? Number(prod.precio_compra)
        : precioVenta * FACTOR_COSTO_ESTIMADO
    return s + costo * Number(it.cantidad)
  }, 0)
}

/** Costo total de la mercadería vendida en un conjunto de ventas. */
export function costoMercaderia(ventas: VentaConCosto[]): number {
  return ventas.reduce((s, v) => s + costoDeVenta(v), 0)
}

/** Ganancia bruta: ventas menos el costo de la mercadería vendida (lo que dejó la venta). */
export function gananciaBruta(totalVentas: number, costoMercaderiaTotal: number): number {
  return totalVentas - costoMercaderiaTotal
}

/** Ganancia neta: ganancia bruta menos los gastos fijos del periodo (lo que quedó al final). */
export function gananciaNeta(gananciaBrutaTotal: number, gastosFijos: number): number {
  return gananciaBrutaTotal - gastosFijos
}

export interface ResumenFinanciero {
  ventas: number
  costoMercaderia: number
  gananciaBruta: number
  gastosFijos: number
  gananciaNeta: number
}

/**
 * Resumen financiero de tres niveles a partir de las cifras del periodo.
 * Si no hay gastos fijos, la ganancia neta coincide con la bruta.
 */
export function resumenFinanciero(params: {
  totalVentas: number
  costoMercaderia: number
  gastosFijos: number
}): ResumenFinanciero {
  const bruta = gananciaBruta(params.totalVentas, params.costoMercaderia)
  const neta = gananciaNeta(bruta, params.gastosFijos)
  return {
    ventas: params.totalVentas,
    costoMercaderia: params.costoMercaderia,
    gananciaBruta: bruta,
    gastosFijos: params.gastosFijos,
    gananciaNeta: neta,
  }
}

export type DiagnosticoFlujo = 'margen' | 'costos_fijos' | 'positivo' | 'sin_datos'

/**
 * Identifica dónde está la fuga de dinero para dar un mensaje accionable:
 * - 'margen': vende por debajo del costo de la mercadería (bruta negativa).
 * - 'costos_fijos': la venta deja ganancia pero los gastos fijos se la comen (neta negativa).
 * - 'positivo': el negocio queda en azul.
 * - 'sin_datos': aún no hay ventas que analizar.
 */
export function diagnosticarFlujo(resumen: ResumenFinanciero): DiagnosticoFlujo {
  if (resumen.ventas <= 0) return 'sin_datos'
  if (resumen.gananciaBruta < 0) return 'margen'
  if (resumen.gananciaNeta < 0) return 'costos_fijos'
  return 'positivo'
}

/** @deprecated Usar el modelo de tres niveles (gananciaBruta / gananciaNeta). */
export function calcularGanancia(totalVentas: number, totalGastos: number): number {
  return totalVentas - totalGastos
}

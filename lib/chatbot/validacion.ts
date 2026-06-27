import type { TipoAccion } from '@/lib/chatbot/tipos'

interface ItemVenta {
  producto?: string
  nombre?: string
  cantidad?: number
  precio_unit?: number
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function limpiarNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => limpiarNulls(item)) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, limpiarNulls(v)])
    ) as T
  }
  return value
}

export function limpiarDatosAccion(datos: Record<string, unknown>): Record<string, unknown> {
  return limpiarNulls(datos)
}

/** Venta lista para confirmar: producto, cantidad y precio por ítem. */
export function ventaDatosCompletos(datos: Record<string, unknown>): boolean {
  const items = Array.isArray(datos.items) ? (datos.items as ItemVenta[]) : []
  if (!items.length) return false
  return items.every((it) => {
    const nombre = (it.producto ?? it.nombre ?? '').toString().trim()
    return nombre.length > 0 && num(it.cantidad) > 0 && num(it.precio_unit) > 0
  })
}

/** Compra lista para confirmar. */
export function compraDatosCompletos(datos: Record<string, unknown>): boolean {
  const items = Array.isArray(datos.items) ? (datos.items as ItemVenta[]) : []
  if (!items.length) return false
  return items.every((it) => {
    const nombre = (it.producto ?? it.nombre ?? '').toString().trim()
    return nombre.length > 0 && num(it.cantidad) > 0 && num(it.precio_unit) > 0
  })
}

export function gastoDatosCompletos(datos: Record<string, unknown>): boolean {
  return num(datos.monto) > 0 && !!(datos.descripcion ?? '').toString().trim()
}

export function fiadoDatosCompletos(datos: Record<string, unknown>): boolean {
  return !!(datos.nombre ?? '').toString().trim() && num(datos.monto) > 0
}

export function accionDatosCompletos(
  tipo: TipoAccion,
  datos: Record<string, unknown>
): boolean {
  switch (tipo) {
    case 'registrar_venta':
      return ventaDatosCompletos(datos)
    case 'registrar_compra':
      return compraDatosCompletos(datos)
    case 'registrar_gasto':
      return gastoDatosCompletos(datos)
    case 'registrar_fiado':
      return fiadoDatosCompletos(datos)
    default:
      return true
  }
}

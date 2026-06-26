import type { Producto } from '@/types'

/** Calza un nombre contra el inventario (exacto o parcial). */
export function matchProductoInventario(
  nombre: string,
  inventario: Pick<Producto, 'id' | 'nombre' | 'precio_venta' | 'precio_compra'>[]
): Pick<Producto, 'id' | 'nombre' | 'precio_venta' | 'precio_compra'> | undefined {
  const clave = nombre.trim().toLowerCase()
  if (!clave) return undefined
  return (
    inventario.find((p) => p.nombre.trim().toLowerCase() === clave) ??
    inventario.find(
      (p) =>
        p.nombre.toLowerCase().includes(clave) || clave.includes(p.nombre.toLowerCase())
    )
  )
}

export function productosSinInventario(
  items: { nombre: string }[],
  inventario: Pick<Producto, 'id' | 'nombre'>[]
): { nombre: string }[] {
  const vistos = new Set<string>()
  const faltantes: { nombre: string }[] = []
  for (const it of items) {
    const clave = it.nombre.trim().toLowerCase()
    if (!clave || vistos.has(clave)) continue
    if (!matchProductoInventario(it.nombre, inventario)) {
      vistos.add(clave)
      faltantes.push({ nombre: it.nombre.trim() })
    }
  }
  return faltantes
}

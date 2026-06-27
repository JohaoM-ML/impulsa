import type { Negocio } from '@/types'
import { recalcularSalud } from '@/lib/salud-server'
import type { ServiceClient, TipoAccion } from '@/lib/chatbot/tipos'

export interface ResultadoAccion {
  ok: boolean
  resumen: string
}

function num(v: unknown, def = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

interface ProductoMin {
  id: string
  nombre: string
  precio_venta: number | null
  precio_compra: number | null
  stock_actual: number
}

/** Calza un nombre dictado con un producto del inventario (match laxo por inclusión). */
function buscarProducto(productos: ProductoMin[], nombre: string): ProductoMin | null {
  const objetivo = normalizar(nombre)
  if (!objetivo) return null
  let mejor: ProductoMin | null = null
  for (const p of productos) {
    const n = normalizar(p.nombre)
    if (n === objetivo) return p
    if (!mejor && (n.includes(objetivo) || objetivo.includes(n))) mejor = p
  }
  return mejor
}

interface ItemDictado {
  producto?: string
  nombre?: string
  cantidad?: number
  precio_unit?: number
}

async function registrarVenta(
  supabase: ServiceClient,
  negocio: Negocio,
  datos: Record<string, unknown>
): Promise<ResultadoAccion> {
  const itemsRaw = Array.isArray(datos.items) ? (datos.items as ItemDictado[]) : []
  if (!itemsRaw.length) return { ok: false, resumen: 'No entendí los productos de la venta.' }

  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, precio_compra, stock_actual')
    .eq('negocio_id', negocio.id)
    .eq('activo', true)
  const inventario = (productos ?? []) as ProductoMin[]

  const items = itemsRaw.map((it) => {
    const nombre = (it.producto ?? it.nombre ?? '').toString().trim()
    const prod = buscarProducto(inventario, nombre)
    const cantidad = num(it.cantidad, 1)
    const precio = num(it.precio_unit, prod?.precio_venta ? Number(prod.precio_venta) : 0)
    return {
      producto_id: prod?.id ?? null,
      nombre_item: prod?.nombre ?? nombre,
      cantidad,
      precio_unit: precio,
      subtotal: cantidad * precio,
    }
  })

  const total = num(datos.total, items.reduce((s, i) => s + i.subtotal, 0))

  const { data: venta, error } = await supabase
    .from('ventas')
    .insert({ negocio_id: negocio.id, total, canal: 'whatsapp', estado: 'pagado' })
    .select()
    .single()
  if (error || !venta) return { ok: false, resumen: 'No pude registrar la venta.' }

  const { error: itemsError } = await supabase
    .from('items_venta')
    .insert(items.map((i) => ({ venta_id: venta.id, ...i })))
  if (itemsError) {
    await supabase.from('ventas').delete().eq('id', venta.id).eq('negocio_id', negocio.id)
    return { ok: false, resumen: 'No pude guardar el detalle de la venta.' }
  }

  let stockConErrores = false
  for (const i of items) {
    if (i.producto_id) {
      const prod = inventario.find((p) => p.id === i.producto_id)
      const nuevoStock = Math.max(0, num(prod?.stock_actual) - i.cantidad)
      const { error: stockError } = await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock, actualizado_en: new Date().toISOString() })
        .eq('id', i.producto_id)
        .eq('negocio_id', negocio.id)
      if (stockError) stockConErrores = true
    }
  }

  if (stockConErrores) {
    return {
      ok: true,
      resumen: `Venta registrada: S/ ${total.toFixed(2)}. Revisa el stock de esos productos.`,
    }
  }

  return { ok: true, resumen: `Venta registrada: S/ ${total.toFixed(2)}` }
}

async function registrarCompra(
  supabase: ServiceClient,
  negocio: Negocio,
  datos: Record<string, unknown>
): Promise<ResultadoAccion> {
  const itemsRaw = Array.isArray(datos.items) ? (datos.items as ItemDictado[]) : []
  if (!itemsRaw.length) return { ok: false, resumen: 'No entendí qué compraste.' }

  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, precio_compra, stock_actual')
    .eq('negocio_id', negocio.id)
  const inventario = (productos ?? []) as ProductoMin[]

  let total = 0
  for (const it of itemsRaw) {
    const nombre = (it.producto ?? it.nombre ?? '').toString().trim()
    if (!nombre) continue
    const cantidad = num(it.cantidad, 1)
    const costo = num(it.precio_unit)
    total += cantidad * costo
    const prod = buscarProducto(inventario, nombre)
    if (prod) {
      const { error } = await supabase
        .from('productos')
        .update({
          stock_actual: num(prod.stock_actual) + cantidad,
          precio_compra: costo || prod.precio_compra,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', prod.id)
        .eq('negocio_id', negocio.id)
      if (error) return { ok: false, resumen: `No pude actualizar el stock de ${prod.nombre}.` }
    } else {
      const { error } = await supabase.from('productos').insert({
        negocio_id: negocio.id,
        nombre,
        stock_actual: cantidad,
        stock_minimo: 5,
        precio_compra: costo || null,
        unidad: 'unidades',
        activo: true,
      })
      if (error) return { ok: false, resumen: `No pude crear el producto ${nombre}.` }
    }
  }

  const totalFinal = num(datos.total, total)
  const { error: gastoError } = await supabase.from('gastos').insert({
    negocio_id: negocio.id,
    descripcion: 'Compra de mercadería (WhatsApp)',
    monto: totalFinal,
    categoria: 'mercaderia',
  })
  if (gastoError) {
    return {
      ok: true,
      resumen: `Compra ingresada al stock, pero revisa el gasto de S/ ${totalFinal.toFixed(2)}.`,
    }
  }

  return { ok: true, resumen: `Compra registrada: S/ ${totalFinal.toFixed(2)} e ingresada al stock` }
}

async function registrarGasto(
  supabase: ServiceClient,
  negocio: Negocio,
  datos: Record<string, unknown>
): Promise<ResultadoAccion> {
  const monto = num(datos.monto)
  const descripcion = (datos.descripcion ?? '').toString().trim() || 'Gasto'
  if (monto <= 0) return { ok: false, resumen: 'No entendí el monto del gasto.' }

  const { error } = await supabase.from('gastos').insert({
    negocio_id: negocio.id,
    descripcion,
    monto,
    categoria: (datos.categoria as string) ?? null,
  })
  if (error) return { ok: false, resumen: 'No pude registrar el gasto.' }

  return { ok: true, resumen: `Gasto registrado: ${descripcion}, S/ ${monto.toFixed(2)}` }
}

async function registrarFiado(
  supabase: ServiceClient,
  negocio: Negocio,
  datos: Record<string, unknown>
): Promise<ResultadoAccion> {
  const monto = num(datos.monto)
  const nombre = (datos.nombre ?? '').toString().trim()
  const direccion = datos.direccion === 'por_pagar' ? 'por_pagar' : 'por_cobrar'
  const operacion = datos.operacion === 'pagar' ? 'pagar' : 'sumar'
  if (!nombre || monto <= 0) return { ok: false, resumen: 'Me falta el nombre o el monto del fiado.' }

  const tabla = direccion === 'por_cobrar' ? 'clientes' : 'proveedores'
  const { data: existentes } = await supabase
    .from(tabla)
    .select('id, nombre, deuda_total')
    .eq('negocio_id', negocio.id)

  const actual = (existentes ?? []).find(
    (r: { nombre: string }) => normalizar(r.nombre) === normalizar(nombre)
  ) as { id: string; deuda_total: number | null } | undefined

  const delta = operacion === 'pagar' ? -monto : monto
  const nuevaDeuda = Math.max(0, num(actual?.deuda_total) + delta)

  if (actual) {
    const { error } = await supabase
      .from(tabla)
      .update({ deuda_total: nuevaDeuda })
      .eq('id', actual.id)
      .eq('negocio_id', negocio.id)
    if (error) return { ok: false, resumen: 'No pude actualizar ese fiado.' }
  } else {
    const { error } = await supabase
      .from(tabla)
      .insert({ negocio_id: negocio.id, nombre, deuda_total: Math.max(0, delta) })
    if (error) return { ok: false, resumen: 'No pude registrar ese fiado.' }
  }

  const quien = direccion === 'por_cobrar' ? `${nombre} te debe` : `le debes a ${nombre}`
  const accionTxt = operacion === 'pagar' ? 'abonado' : 'anotado'
  return { ok: true, resumen: `Fiado ${accionTxt}: ${quien} S/ ${nuevaDeuda.toFixed(2)}` }
}

/**
 * Ejecuta una acción confirmada sobre la base de datos (service role, ya acotada
 * al negocio resuelto por teléfono). Recalcula el PymScore tras movimientos de dinero.
 */
export async function ejecutarAccion(
  supabase: ServiceClient,
  negocio: Negocio,
  tipo: TipoAccion,
  datos: Record<string, unknown>
): Promise<ResultadoAccion> {
  let resultado: ResultadoAccion
  switch (tipo) {
    case 'registrar_venta':
      resultado = await registrarVenta(supabase, negocio, datos)
      break
    case 'registrar_compra':
      resultado = await registrarCompra(supabase, negocio, datos)
      break
    case 'registrar_gasto':
      resultado = await registrarGasto(supabase, negocio, datos)
      break
    case 'registrar_fiado':
      resultado = await registrarFiado(supabase, negocio, datos)
      break
    default:
      return { ok: false, resumen: 'Esa acción no se puede ejecutar.' }
  }

  if (resultado.ok) {
    try {
      await recalcularSalud(supabase, negocio, { regenerarExplicacion: true })
    } catch (err) {
      console.error('[chatbot] recalcularSalud', err)
    }
  }
  return resultado
}

/** Indica si el tipo de acción escribe en la base de datos. */
export function esAccionDeEscritura(tipo: TipoAccion | undefined): boolean {
  return (
    tipo === 'registrar_venta' ||
    tipo === 'registrar_compra' ||
    tipo === 'registrar_gasto' ||
    tipo === 'registrar_fiado'
  )
}

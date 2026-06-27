import type { SupabaseClient } from '@supabase/supabase-js'
import { generarMensajeChaski } from '@/lib/claude'
import {
  analizarCompraInteligente,
  type ProductoCompraInput,
  type VentaProductoInput,
} from '@/lib/compra-inteligente'
import type {
  CompraInteligenteProveedor,
  CompraInteligenteResumen,
  Negocio,
  Nivel,
} from '@/types'

const DIAS_HISTORIAL_COMPRA = 28

type NegocioCompra = Pick<Negocio, 'id' | 'user_id'>

interface ProductoRow {
  id: string
  nombre: string
  categoria: string | null
  proveedor_id: string | null
  unidad: string | null
  unidad_compra: string | null
  factor_compra: number | null
  stock_actual: number | null
  stock_minimo: number | null
  precio_compra: number | null
  precio_venta: number | null
}

interface ProveedorRow {
  id: string
  nombre: string
  dia_visita: number | null
  frecuencia_dias: number | null
}

interface ItemVentaRow {
  venta_id: string
  producto_id: string | null
  nombre_item: string
  cantidad: number
  ventas:
    | { creado_en: string; negocio_id: string }
    | { creado_en: string; negocio_id: string }[]
    | null
}

function inicioHistorial(): string {
  const d = new Date()
  d.setDate(d.getDate() - DIAS_HISTORIAL_COMPRA)
  return d.toISOString()
}

function nivelValido(nivel: number | null | undefined): Nivel {
  return (nivel && nivel >= 1 && nivel <= 4 ? nivel : 1) as Nivel
}

function extraerFechaVenta(item: ItemVentaRow): string {
  const venta = Array.isArray(item.ventas) ? item.ventas[0] : item.ventas
  return venta?.creado_en ?? new Date().toISOString()
}

export async function construirCompraInteligente(
  supabase: SupabaseClient,
  negocio: NegocioCompra
): Promise<CompraInteligenteResumen> {
  const desde = inicioHistorial()

  const [{ data: productos }, { data: proveedores }, { data: items }, { data: progreso }] =
    await Promise.all([
      supabase
        .from('productos')
        .select(
          'id, nombre, categoria, proveedor_id, unidad, unidad_compra, factor_compra, stock_actual, stock_minimo, precio_compra, precio_venta'
        )
        .eq('negocio_id', negocio.id)
        .eq('activo', true),
      supabase
        .from('proveedores')
        .select('id, nombre, dia_visita, frecuencia_dias')
        .eq('negocio_id', negocio.id)
        .order('nombre'),
      supabase
        .from('items_venta')
        .select('venta_id, producto_id, nombre_item, cantidad, ventas!inner(negocio_id, creado_en)')
        .eq('ventas.negocio_id', negocio.id)
        .gte('ventas.creado_en', desde),
      supabase
        .from('progreso_usuario')
        .select('nivel')
        .eq('user_id', negocio.user_id)
        .maybeSingle(),
    ])

  const proveedoresRows = (proveedores ?? []) as ProveedorRow[]
  const proveedorPorId = new Map(proveedoresRows.map((p) => [p.id, p]))

  const productosMotor: ProductoCompraInput[] = ((productos ?? []) as ProductoRow[]).map((p) => {
    const proveedor = p.proveedor_id ? proveedorPorId.get(p.proveedor_id) : undefined
    return {
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria ?? null,
      proveedor_id: p.proveedor_id ?? null,
      proveedor_nombre: proveedor?.nombre ?? 'Sin proveedor',
      dia_visita: proveedor?.dia_visita ?? null,
      frecuencia_dias: Number(proveedor?.frecuencia_dias ?? 7),
      unidad: p.unidad ?? 'unidades',
      unidad_compra: p.unidad_compra ?? null,
      factor_compra: Number(p.factor_compra ?? 1),
      stock_actual: Number(p.stock_actual ?? 0),
      stock_minimo: Number(p.stock_minimo ?? 5),
      precio_compra: p.precio_compra != null ? Number(p.precio_compra) : null,
      precio_venta: p.precio_venta != null ? Number(p.precio_venta) : null,
    }
  })

  const ventasMotor: VentaProductoInput[] = ((items ?? []) as ItemVentaRow[]).map((it) => ({
    venta_id: it.venta_id,
    producto_id: it.producto_id,
    nombre_item: it.nombre_item,
    cantidad: Number(it.cantidad ?? 0),
    creado_en: extraerFechaVenta(it),
  }))

  const { recomendaciones, patrones, consejos } = analizarCompraInteligente(
    productosMotor,
    ventasMotor
  )

  const grupos = {
    pedir: recomendaciones.filter((p) => p.clasificacion === 'pedir'),
    opcional: recomendaciones.filter((p) => p.clasificacion === 'opcional'),
    noPedir: recomendaciones.filter((p) => p.clasificacion === 'no_pedir'),
  }

  const nivel = nivelValido((progreso as { nivel?: number } | null)?.nivel)
  const mensajeChaski = await generarMensajeChaski({ nivel, grupos, patrones, consejos })

  const proveedoresRespuesta: CompraInteligenteProveedor[] = proveedoresRows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    dia_visita: p.dia_visita,
    frecuencia_dias: Number(p.frecuencia_dias ?? 7),
  }))

  return {
    grupos,
    consejos,
    patrones,
    proveedores: proveedoresRespuesta,
    mensajeChaski,
  }
}

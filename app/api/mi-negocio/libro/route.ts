import { NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { inicioPeriodoActual, periodoFlujoValido } from '@/lib/fechas-lima'
import type {
  Gasto,
  ItemVenta,
  LibroResumen,
  MedioPago,
  MovimientoLibro,
  VentaConItems,
} from '@/types'

type VentaRow = VentaConItems & { clientes?: { nombre: string } | null }

// Arma un concepto legible para el libro diario a partir de los items de la venta.
function conceptoVenta(venta: VentaRow): string {
  const items = venta.items_venta ?? []
  if (!items.length) return 'Venta'
  const primero = items[0] as ItemVenta
  const nombrePrimero = `${primero.cantidad} ${primero.nombre_item}`
  if (items.length === 1) return nombrePrimero
  return `${nombrePrimero} y ${items.length - 1} más`
}

export async function GET(request: Request) {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json(
        { error: error ?? 'Negocio no encontrado' },
        { status: error === 'No autorizado' ? 401 : 404 }
      )
    }

    const periodo = periodoFlujoValido(new URL(request.url).searchParams.get('periodo'))
    const desde = new Date(inicioPeriodoActual(periodo)).toISOString()

    const [{ data: ventasData, error: ventasError }, { data: gastosData, error: gastosError }] =
      await Promise.all([
        supabase
          .from('ventas')
          .select('*, items_venta(*), clientes(nombre)')
          .eq('negocio_id', negocio.id)
          .gte('creado_en', desde)
          .order('creado_en', { ascending: false }),
        supabase
          .from('gastos')
          .select('*')
          .eq('negocio_id', negocio.id)
          .gte('creado_en', desde)
          .order('creado_en', { ascending: false }),
      ])

    if (ventasError) throw ventasError
    if (gastosError) throw gastosError

    const ventas = (ventasData ?? []) as VentaRow[]
    const gastos = (gastosData ?? []) as Gasto[]

    const movVentas: MovimientoLibro[] = ventas.map((v) => ({
      id: `venta-${v.id}`,
      tipo: 'venta',
      fecha: v.creado_en,
      concepto: v.clientes?.nombre ? `${conceptoVenta(v)} · ${v.clientes.nombre}` : conceptoVenta(v),
      monto: Number(v.total),
      medio_pago: (v.medio_pago ?? null) as MedioPago | null,
    }))

    const movGastos: MovimientoLibro[] = gastos.map((g) => ({
      id: `gasto-${g.id}`,
      tipo: 'gasto',
      fecha: g.creado_en,
      concepto: g.descripcion,
      monto: Number(g.monto),
    }))

    const movimientos = [...movVentas, ...movGastos].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )

    const totalEntradas = movVentas.reduce((s, m) => s + m.monto, 0)
    const totalSalidas = movGastos.reduce((s, m) => s + m.monto, 0)

    const respuesta: LibroResumen = {
      periodo,
      ventas: ventas.map(({ clientes: _clientes, ...venta }) => venta),
      movimientos,
      totalEntradas: Math.round(totalEntradas * 100) / 100,
      totalSalidas: Math.round(totalSalidas * 100) / 100,
    }

    return NextResponse.json(respuesta)
  } catch (err) {
    console.error('[GET /api/mi-negocio/libro]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

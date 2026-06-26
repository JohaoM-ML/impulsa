import { generarExplicacionPymScore } from '@/lib/claude'
import {
  calcularComponentes,
  calcularPymScore,
  gastosEfectivosSemana,
  inicioSemana,
} from '@/lib/pym-score'

type SupabaseLike = {
  from: (tabla: string) => any
}

type NegocioLike = { id: string; creado_en?: string | null }

interface ItemVentaCosto {
  cantidad: number
  precio_unit: number
  productos: { precio_compra: number | null } | { precio_compra: number | null }[] | null
}

/** Costo de la mercadería vendida en una venta (fallback 65% del precio de venta). */
function costoDeVenta(venta: { items_venta?: ItemVentaCosto[] }): number {
  const items = venta.items_venta ?? []
  return items.reduce((s, it) => {
    const prod = Array.isArray(it.productos) ? it.productos[0] : it.productos
    const precioVenta = Number(it.precio_unit)
    const costo = prod?.precio_compra != null ? Number(prod.precio_compra) : precioVenta * 0.65
    return s + costo * Number(it.cantidad)
  }, 0)
}

/**
 * Recalcula el PymScore de la semana actual con los datos en vivo y lo persiste.
 * - Incluye el costo de la mercadería vendida (COGS) dentro de los gastos.
 * - Solo llama a Claude si se pide regenerar la explicación o si aún no existe.
 * Devuelve la fila guardada.
 */
export async function recalcularScore(
  supabase: SupabaseLike,
  negocio: NegocioLike,
  opts: { regenerarExplicacion?: boolean } = {}
) {
  const semana = inicioSemana()
  const inicio = new Date(semana + 'T00:00:00').toISOString()
  const hace28dias = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: ventas }, { data: gastos }, { data: clientes }, { data: ventas28 }, { data: existente }] =
    await Promise.all([
      supabase
        .from('ventas')
        .select('total, items_venta(cantidad, precio_unit, productos(precio_compra))')
        .eq('negocio_id', negocio.id)
        .gte('creado_en', inicio),
      supabase.from('gastos').select('monto, categoria').eq('negocio_id', negocio.id).gte('creado_en', inicio),
      supabase.from('clientes').select('deuda_total').eq('negocio_id', negocio.id),
      supabase.from('ventas').select('creado_en').eq('negocio_id', negocio.id).gte('creado_en', hace28dias),
      supabase.from('pym_scores').select('*').eq('negocio_id', negocio.id).eq('semana', semana).maybeSingle(),
    ])

  const ventasSemana = (ventas ?? []).reduce((s: number, v: { total: number }) => s + Number(v.total), 0)
  const costoMercaderia = (ventas ?? []).reduce((s: number, v: { items_venta?: ItemVentaCosto[] }) => s + costoDeVenta(v), 0)
  const { gastosEfectivos } = gastosEfectivosSemana(gastos ?? [])
  const gastosTotales = gastosEfectivos + costoMercaderia
  const deudaTotal = (clientes ?? []).reduce((s: number, c: { deuda_total: number | null }) => s + Number(c.deuda_total ?? 0), 0)

  const { score, margen } = calcularPymScore({
    ventas: ventasSemana,
    gastos: gastosTotales,
    deudaTotal,
  })

  const diasActivos = new Set((ventas28 ?? []).map((v: { creado_en: string }) => v.creado_en.split('T')[0])).size
  const antiguedadMeses = negocio.creado_en
    ? Math.max(0, (Date.now() - new Date(negocio.creado_en).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0
  const ratioDeuda = ventasSemana > 0 ? deudaTotal / ventasSemana : 0
  const componentes = calcularComponentes({
    margen,
    ratioDeuda,
    diasActivos,
    diasPeriodo: 28,
    antiguedadMeses,
  })

  // La explicación de Claude se regenera si: se pide explícitamente, no existe,
  // o los números cambiaron (score o margen) respecto a lo guardado. Así el texto
  // nunca queda desfasado del número, pero no gastamos tokens en cada GET idéntico.
  const margenGuardado = existente?.margen != null ? Number(existente.margen) : null
  const numerosCambiaron =
    !existente ||
    existente.score !== score ||
    margenGuardado === null ||
    Math.abs(margenGuardado - margen) > 0.5

  let explicacion: string | null = existente?.explicacion ?? null
  if (opts.regenerarExplicacion || !explicacion || numerosCambiaron) {
    explicacion = await generarExplicacionPymScore({
      score,
      ventas: ventasSemana,
      gastos: gastosTotales,
      margen,
      deudaTotal,
    })
  }

  const { data, error } = await supabase
    .from('pym_scores')
    .upsert(
      {
        negocio_id: negocio.id,
        semana,
        score,
        ventas_semana: ventasSemana,
        gastos_semana: gastosTotales,
        margen,
        explicacion,
        componentes,
      },
      { onConflict: 'negocio_id,semana' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

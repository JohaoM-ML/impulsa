import { generarExplicacionSalud } from '@/lib/claude'
import {
  calcularIndiceSalud,
  gastosEfectivosSemana,
  inicioSemana,
  inicioSemanaAnterior,
} from '@/lib/salud'
import { costoDeVenta, type VentaConCosto } from '@/lib/finanzas'
import type { Nivel } from '@/lib/vocabulario'

type SupabaseLike = {
  from: (tabla: string) => any
}

type NegocioLike = { id: string; user_id?: string | null; creado_en?: string | null }

function nivelValido(nivel: number | null | undefined): Nivel {
  return (nivel && nivel >= 1 && nivel <= 4 ? nivel : 1) as Nivel
}

/**
 * Recalcula el Índice de Salud Financiera de la semana actual y lo persiste.
 */
export async function recalcularSalud(
  supabase: SupabaseLike,
  negocio: NegocioLike,
  opts: { regenerarExplicacion?: boolean } = {}
) {
  const semana = inicioSemana()
  const semanaAnterior = inicioSemanaAnterior()
  const inicio = new Date(semana + 'T00:00:00').toISOString()
  const inicioAnterior = new Date(semanaAnterior + 'T00:00:00').toISOString()
  const hace28dias = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: ventas },
    { data: ventasSemanaAnterior },
    { data: gastos },
    { data: clientes },
    { data: proveedores },
    { data: gastosFijos },
    { data: ventas28 },
    { data: existente },
    { data: progreso },
  ] = await Promise.all([
    supabase
      .from('ventas')
      .select('total, items_venta(cantidad, precio_unit, productos(precio_compra))')
      .eq('negocio_id', negocio.id)
      .gte('creado_en', inicio),
    supabase
      .from('ventas')
      .select('total')
      .eq('negocio_id', negocio.id)
      .gte('creado_en', inicioAnterior)
      .lt('creado_en', inicio),
    supabase.from('gastos').select('monto, categoria').eq('negocio_id', negocio.id).gte('creado_en', inicio),
    supabase.from('clientes').select('deuda_total').eq('negocio_id', negocio.id),
    supabase.from('proveedores').select('deuda_total').eq('negocio_id', negocio.id),
    supabase.from('gastos_fijos').select('monto').eq('negocio_id', negocio.id).eq('activo', true),
    supabase.from('ventas').select('creado_en').eq('negocio_id', negocio.id).gte('creado_en', hace28dias),
    supabase
      .from('salud_financiera')
      .select('*')
      .eq('negocio_id', negocio.id)
      .eq('semana', semana)
      .maybeSingle(),
    negocio.user_id
      ? supabase.from('progreso_usuario').select('nivel').eq('user_id', negocio.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const ventasSemana = (ventas ?? []).reduce((s: number, v: { total: number }) => s + Number(v.total), 0)
  const ventasAnterior = (ventasSemanaAnterior ?? []).reduce(
    (s: number, v: { total: number }) => s + Number(v.total),
    0
  )
  const costoMercaderia = (ventas ?? []).reduce(
    (s: number, v: VentaConCosto) => s + costoDeVenta(v),
    0
  )
  const { gastosEfectivos } = gastosEfectivosSemana(gastos ?? [])
  const gastosTotales = gastosEfectivos + costoMercaderia

  const deudaClientes = (clientes ?? []).reduce(
    (s: number, c: { deuda_total: number | null }) => s + Number(c.deuda_total ?? 0),
    0
  )
  const deudaProveedores = (proveedores ?? []).reduce(
    (s: number, p: { deuda_total: number | null }) => s + Number(p.deuda_total ?? 0),
    0
  )
  const deudaTotal = deudaClientes + deudaProveedores

  const gastosFijosMensuales = (gastosFijos ?? []).reduce(
    (s: number, g: { monto: number }) => s + Number(g.monto),
    0
  )
  const coberturaLiquidez =
    gastosFijosMensuales > 0 ? ventasSemana / (gastosFijosMensuales / 4) : null

  const variacionVentas =
    ventasAnterior > 0 ? (ventasSemana - ventasAnterior) / ventasAnterior : null

  const ratioDeuda = ventasSemana > 0 ? deudaTotal / ventasSemana : 0
  const diasActivos = new Set(
    (ventas28 ?? []).map((v: { creado_en: string }) => v.creado_en.split('T')[0])
  ).size

  const { indice, margen, componentes } = calcularIndiceSalud({
    ventas: ventasSemana,
    gastos: gastosTotales,
    ratioDeuda,
    diasActivos,
    diasPeriodo: 28,
    coberturaLiquidez,
    variacionVentas,
  })

  const margenGuardado = existente?.margen != null ? Number(existente.margen) : null
  const numerosCambiaron =
    !existente ||
    existente.indice !== indice ||
    margenGuardado === null ||
    Math.abs(margenGuardado - margen) > 0.5

  let explicacion: string | null = existente?.explicacion ?? null
  if (opts.regenerarExplicacion || !explicacion || numerosCambiaron) {
    explicacion = await generarExplicacionSalud({
      nivel: nivelValido((progreso as { nivel?: number } | null)?.nivel),
      indice,
      ventas: ventasSemana,
      gastos: gastosTotales,
      margen,
      deudaTotal,
      componentes,
    })
  }

  const { data, error } = await supabase
    .from('salud_financiera')
    .upsert(
      {
        negocio_id: negocio.id,
        semana,
        indice,
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

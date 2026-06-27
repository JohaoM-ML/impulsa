import type { Negocio } from '@/types'
import type { Nivel } from '@/lib/vocabulario'
import { vocab } from '@/lib/vocabulario'
import { enviarWhatsApp } from '@/lib/twilio'
import {
  fechaCortaPeru,
  finDiaPeru,
  hoyEnPeruISO,
  horaAMinutos,
  inicioDiaPeru,
  minutosDesdeMedianochePeru,
} from '@/lib/timezone'
import type { ServiceClient } from '@/lib/chatbot/tipos'

export interface DatosResumenDia {
  totalVentas: number
  cantidadVentas: number
  totalGastos: number
  ganancias: number
  productoTop: { nombre: string; cantidad: number } | null
  stockBajo: number
  fiadosTotal: number
  fiadosCount: number
}

export async function calcularResumenDia(
  supabase: ServiceClient,
  negocioId: string,
  fechaISO?: string
): Promise<DatosResumenDia> {
  const inicio = inicioDiaPeru(fechaISO)
  const fin = finDiaPeru(fechaISO)

  const [{ data: ventasHoy }, { data: gastosHoy }, { data: productos }, { data: clientes }] =
    await Promise.all([
      supabase
        .from('ventas')
        .select('total, items_venta(nombre_item, cantidad, precio_unit, productos(precio_compra))')
        .eq('negocio_id', negocioId)
        .gte('creado_en', inicio)
        .lte('creado_en', fin),
      supabase
        .from('gastos')
        .select('monto')
        .eq('negocio_id', negocioId)
        .gte('creado_en', inicio)
        .lte('creado_en', fin),
      supabase
        .from('productos')
        .select('stock_actual, stock_minimo')
        .eq('negocio_id', negocioId)
        .eq('activo', true),
      supabase
        .from('clientes')
        .select('deuda_total')
        .eq('negocio_id', negocioId)
        .gt('deuda_total', 0),
    ])

  const totalVentas = (ventasHoy ?? []).reduce((s, v) => s + Number(v.total), 0)
  const totalGastos = (gastosHoy ?? []).reduce((s, g) => s + Number(g.monto), 0)
  const cantidadVentas = ventasHoy?.length ?? 0

  let ganancias = 0
  const rotacion: Record<string, number> = {}

  for (const venta of ventasHoy ?? []) {
    const items = (venta.items_venta ?? []) as Array<{
      nombre_item: string
      cantidad: number
      precio_unit: number
      productos: { precio_compra: number | null } | { precio_compra: number | null }[] | null
    }>
    for (const it of items) {
      const cantidad = Number(it.cantidad)
      const precioVenta = Number(it.precio_unit)
      const prodRaw = it.productos
      const prod = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw
      const costo =
        prod?.precio_compra != null ? Number(prod.precio_compra) : precioVenta * 0.65
      ganancias += (precioVenta - costo) * cantidad
      const nombre = it.nombre_item.trim()
      rotacion[nombre] = (rotacion[nombre] ?? 0) + cantidad
    }
  }

  let productoTop: { nombre: string; cantidad: number } | null = null
  for (const [nombre, cantidad] of Object.entries(rotacion)) {
    if (!productoTop || cantidad > productoTop.cantidad) {
      productoTop = { nombre, cantidad }
    }
  }

  const stockBajo = (productos ?? []).filter(
    (p) => Number(p.stock_actual) <= Number(p.stock_minimo)
  ).length

  const fiados = clientes ?? []
  const fiadosTotal = fiados.reduce((s, c) => s + Number(c.deuda_total), 0)

  return {
    totalVentas,
    cantidadVentas,
    totalGastos,
    ganancias: Math.round(ganancias * 100) / 100,
    productoTop,
    stockBajo,
    fiadosTotal,
    fiadosCount: fiados.length,
  }
}

export function formatearResumenWhatsApp(
  negocio: Pick<Negocio, 'nombre'>,
  datos: DatosResumenDia,
  nivel: Nivel,
  fechaISO?: string
): string {
  const fecha = fechaCortaPeru(fechaISO)
  const labelGanancia = vocab('ganancia', nivel)
  const labelGasto = vocab('gasto', nivel)
  const labelVentas = vocab('ventas_hoy', nivel)

  const lineas = [
    `📊 Resumen del día — ${fecha}`,
    `${negocio.nombre}`,
    '',
    `${labelVentas.charAt(0).toUpperCase() + labelVentas.slice(1)}: S/ ${datos.totalVentas.toFixed(2)} (${datos.cantidadVentas} ventas)`,
    `${labelGanancia.charAt(0).toUpperCase() + labelGanancia.slice(1)}: S/ ${datos.ganancias.toFixed(2)}`,
    `${labelGasto.charAt(0).toUpperCase() + labelGasto.slice(1)}: S/ ${datos.totalGastos.toFixed(2)}`,
  ]

  if (datos.productoTop) {
    lineas.push(`⭐ Más vendido: ${datos.productoTop.nombre} x${datos.productoTop.cantidad}`)
  }

  if (datos.stockBajo > 0) {
    lineas.push(`⚠️ ${datos.stockBajo} productos con ${vocab('inventario_bajo', nivel)}`)
  }

  if (datos.fiadosCount > 0) {
    lineas.push(
      `💳 ${vocab('deuda_cobrar', nivel).charAt(0).toUpperCase() + vocab('deuda_cobrar', nivel).slice(1)}: S/ ${datos.fiadosTotal.toFixed(2)} (${datos.fiadosCount})`
    )
  }

  if (datos.cantidadVentas === 0 && datos.totalGastos === 0) {
    lineas.push('', 'Hoy no registraste movimientos. Mañana seguimos 💪')
  } else {
    lineas.push('', '¡Buen trabajo hoy! Descansa y mañana seguimos.')
  }

  return lineas.join('\n')
}

/** ¿Ya pasó la hora de cierre y aún no se envió el resumen de hoy? */
export function debeEnviarResumenHoy(
  horaCierre: string,
  ultimoResumenEnviado: string | null | undefined
): boolean {
  const hoy = hoyEnPeruISO()
  if (ultimoResumenEnviado === hoy) return false
  return minutosDesdeMedianochePeru() >= horaAMinutos(horaCierre)
}

export async function enviarResumenDiarioNegocio(
  supabase: ServiceClient,
  negocio: Negocio,
  nivel: Nivel
): Promise<{ ok: boolean; motivo?: string }> {
  if (!negocio.telefono_wsp) {
    return { ok: false, motivo: 'sin_whatsapp' }
  }
  if (!negocio.resumen_diario_activo) {
    return { ok: false, motivo: 'desactivado' }
  }

  const horaCierre = (negocio.hora_cierre_dia ?? '21:00').slice(0, 5)
  if (!debeEnviarResumenHoy(horaCierre, negocio.ultimo_resumen_enviado)) {
    return { ok: false, motivo: 'no_toca' }
  }

  const datos = await calcularResumenDia(supabase, negocio.id)
  const mensaje = formatearResumenWhatsApp(negocio, datos, nivel)
  await enviarWhatsApp(negocio.telefono_wsp, mensaje)

  const hoy = hoyEnPeruISO()
  await supabase
    .from('negocios')
    .update({ ultimo_resumen_enviado: hoy })
    .eq('id', negocio.id)

  return { ok: true }
}

export async function procesarResumenesDiarios(supabase: ServiceClient): Promise<{
  enviados: number
  omitidos: number
  errores: number
}> {
  const { data: negocios, error } = await supabase
    .from('negocios')
    .select('*')
    .not('telefono_wsp', 'is', null)
    .eq('resumen_diario_activo', true)

  if (error) throw error
  if (!negocios?.length) return { enviados: 0, omitidos: 0, errores: 0 }

  const userIds = negocios.map((n) => n.user_id)
  const { data: progresos } = await supabase
    .from('progreso_usuario')
    .select('user_id, nivel')
    .in('user_id', userIds)

  const nivelPorUser = new Map(
    (progresos ?? []).map((p: { user_id: string; nivel: number }) => [p.user_id, p.nivel])
  )

  let enviados = 0
  let omitidos = 0
  let errores = 0

  for (const negocio of negocios as Negocio[]) {
    const nivelRaw = nivelPorUser.get(negocio.user_id)
    const nivel = (Number(nivelRaw) >= 1 && Number(nivelRaw) <= 4 ? Number(nivelRaw) : 1) as Nivel

    try {
      const resultado = await enviarResumenDiarioNegocio(supabase, negocio, nivel)
      if (resultado.ok) enviados++
      else omitidos++
    } catch (err) {
      console.error(`[resumen-diario] negocio ${negocio.id}`, err)
      errores++
    }
  }

  return { enviados, omitidos, errores }
}

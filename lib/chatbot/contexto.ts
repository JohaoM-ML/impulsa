import type { Negocio } from '@/types'
import type { Nivel } from '@/lib/vocabulario'
import type {
  EstadoConversacion,
  ServiceClient,
  TurnoHistorial,
} from '@/lib/chatbot/tipos'

const MAX_TURNOS_HISTORIAL = 8

function inicioDeHoy(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Nivel del dueño (1-4); 1 por defecto si aún no hay progreso. */
export async function cargarNivel(supabase: ServiceClient, userId: string): Promise<Nivel> {
  const { data } = await supabase
    .from('progreso_usuario')
    .select('nivel')
    .eq('user_id', userId)
    .maybeSingle()

  const nivel = Number(data?.nivel)
  return (nivel >= 1 && nivel <= 4 ? nivel : 1) as Nivel
}

/** Estado de la conversación de WhatsApp (crea valores por defecto si no existe). */
export async function cargarConversacion(
  supabase: ServiceClient,
  negocioId: string,
  telefono: string
): Promise<EstadoConversacion> {
  const { data } = await supabase
    .from('conversaciones_wsp')
    .select('estado_flujo, contexto, historial')
    .eq('negocio_id', negocioId)
    .eq('telefono', telefono)
    .maybeSingle()

  return {
    estado_flujo:
      (data?.estado_flujo as EstadoConversacion['estado_flujo']) ?? 'idle',
    contexto: (data?.contexto as EstadoConversacion['contexto']) ?? {},
    historial: Array.isArray(data?.historial) ? (data!.historial as TurnoHistorial[]) : [],
  }
}

/** Persiste el nuevo estado de la conversación (upsert por negocio+teléfono). */
export async function guardarConversacion(
  supabase: ServiceClient,
  negocioId: string,
  telefono: string,
  estado: EstadoConversacion
): Promise<void> {
  await supabase.from('conversaciones_wsp').upsert(
    {
      negocio_id: negocioId,
      telefono,
      estado_flujo: estado.estado_flujo,
      contexto: estado.contexto,
      historial: estado.historial.slice(-MAX_TURNOS_HISTORIAL),
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: 'negocio_id,telefono' }
  )
}

/**
 * Resumen real del negocio para que el asesor responda con datos y no alucine:
 * ventas/gastos de hoy, productos con stock bajo, top del día y fiados pendientes.
 */
export async function construirResumenNegocio(
  supabase: ServiceClient,
  negocio: Negocio
): Promise<string> {
  const hoy = inicioDeHoy()

  const [{ data: ventasHoy }, { data: gastosHoy }, { data: productos }, { data: clientes }, { data: scoreRow }] =
    await Promise.all([
      supabase
        .from('ventas')
        .select('total, items_venta(nombre_item, cantidad)')
        .eq('negocio_id', negocio.id)
        .gte('creado_en', hoy),
      supabase.from('gastos').select('monto').eq('negocio_id', negocio.id).gte('creado_en', hoy),
      supabase
        .from('productos')
        .select('nombre, stock_actual, stock_minimo')
        .eq('negocio_id', negocio.id)
        .eq('activo', true),
      supabase.from('clientes').select('nombre, deuda_total').eq('negocio_id', negocio.id).gt('deuda_total', 0),
      supabase
        .from('salud_financiera')
        .select('indice')
        .eq('negocio_id', negocio.id)
        .order('semana', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const totalVentas = (ventasHoy ?? []).reduce((s, v: { total: number }) => s + Number(v.total), 0)
  const totalGastos = (gastosHoy ?? []).reduce((s, g: { monto: number }) => s + Number(g.monto), 0)

  const conteoItems = new Map<string, number>()
  for (const v of ventasHoy ?? []) {
    for (const it of (v as { items_venta?: { nombre_item: string; cantidad: number }[] }).items_venta ?? []) {
      conteoItems.set(it.nombre_item, (conteoItems.get(it.nombre_item) ?? 0) + Number(it.cantidad))
    }
  }
  const top = Array.from(conteoItems.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const stockBajo = (productos ?? [])
    .filter((p: { stock_actual: number; stock_minimo: number }) => Number(p.stock_actual) <= Number(p.stock_minimo))
    .slice(0, 8)
    .map((p: { nombre: string; stock_actual: number }) => `${p.nombre} (${p.stock_actual})`)

  const fiados = (clientes ?? [])
    .slice(0, 8)
    .map((c: { nombre: string; deuda_total: number }) => `${c.nombre}: S/ ${Number(c.deuda_total).toFixed(2)}`)
  const totalFiado = (clientes ?? []).reduce((s, c: { deuda_total: number }) => s + Number(c.deuda_total), 0)

  const lineas = [
    `Negocio: ${negocio.nombre}${negocio.rubro ? ` (${negocio.rubro})` : ''}`,
    `Ventas de hoy: S/ ${totalVentas.toFixed(2)} (${(ventasHoy ?? []).length} ventas)`,
    `Gastos de hoy: S/ ${totalGastos.toFixed(2)}`,
    `Ganancia aproximada de hoy: S/ ${(totalVentas - totalGastos).toFixed(2)}`,
    top.length ? `Top productos de hoy: ${top.map(([n, c]) => `${n} x${c}`).join(', ')}` : 'Aún no hay ventas hoy.',
    stockBajo.length ? `Stock bajo: ${stockBajo.join(', ')}` : 'Sin alertas de stock.',
    fiados.length ? `Te deben (fiado): ${fiados.join('; ')} | Total: S/ ${totalFiado.toFixed(2)}` : 'Nadie te debe ahora.',
    scoreRow?.indice != null
      ? `Salud financiera actual: ${scoreRow.indice}/100`
      : 'Aún no tiene salud financiera calculada.',
  ]

  return lineas.join('\n')
}

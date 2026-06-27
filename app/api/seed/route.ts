import { NextResponse } from 'next/server'
import { getNegocioFromSession } from '@/lib/supabase/server'
import { calcularIndiceSalud } from '@/lib/salud'
import { recalcularSalud } from '@/lib/salud-server'

// Inventario realista de bodega peruana para que la demo se vea creíble.
const INVENTARIO: Array<{
  nombre: string
  categoria: string
  stock: number
  min: number
  compra: number
  venta: number
}> = [
  // Bebidas
  { nombre: 'Inca Kola 500ml', categoria: 'Bebidas', stock: 2, min: 6, compra: 1.3, venta: 1.8 },
  { nombre: 'Coca Cola 500ml', categoria: 'Bebidas', stock: 3, min: 6, compra: 7.7, venta: 11.0 },
  { nombre: 'Sporade 500ml', categoria: 'Bebidas', stock: 5, min: 6, compra: 1.1, venta: 1.5 },
  { nombre: 'Agua San Luis 625ml', categoria: 'Bebidas', stock: 24, min: 8, compra: 0.9, venta: 1.5 },
  { nombre: 'Cifrut 300ml', categoria: 'Bebidas', stock: 18, min: 6, compra: 0.8, venta: 1.2 },
  { nombre: 'Pilsen 305ml', categoria: 'Bebidas', stock: 30, min: 12, compra: 3.2, venta: 5.0 },
  { nombre: 'Frugos del Valle 1L', categoria: 'Bebidas', stock: 9, min: 4, compra: 3.5, venta: 5.5 },
  { nombre: 'Red Bull 250ml', categoria: 'Bebidas', stock: 12, min: 4, compra: 5.0, venta: 7.5 },
  // Abarrotes
  { nombre: 'Arroz Costeño 1kg', categoria: 'Abarrotes', stock: 22, min: 8, compra: 3.5, venta: 4.8 },
  { nombre: 'Azúcar Rubia 1kg', categoria: 'Abarrotes', stock: 0, min: 6, compra: 5.1, venta: 8.8 },
  { nombre: 'Aceite Primor 1L', categoria: 'Abarrotes', stock: 14, min: 5, compra: 8.0, venta: 9.5 },
  { nombre: 'Atún Florida lata', categoria: 'Abarrotes', stock: 3, min: 6, compra: 7.6, venta: 10.2 },
  { nombre: 'Leche Gloria lata', categoria: 'Abarrotes', stock: 40, min: 12, compra: 3.4, venta: 4.5 },
  { nombre: 'Fideos Don Vittorio 500g', categoria: 'Abarrotes', stock: 26, min: 8, compra: 2.6, venta: 3.6 },
  { nombre: 'Lentejas 500g', categoria: 'Abarrotes', stock: 16, min: 5, compra: 3.0, venta: 4.4 },
  { nombre: 'Sal Marina 1kg', categoria: 'Abarrotes', stock: 19, min: 5, compra: 1.2, venta: 2.0 },
  { nombre: 'Harina Blanca Flor 1kg', categoria: 'Abarrotes', stock: 11, min: 5, compra: 3.8, venta: 5.2 },
  { nombre: 'Pan de Molde Bimbo', categoria: 'Abarrotes', stock: 7, min: 4, compra: 5.5, venta: 7.5 },
  // Limpieza
  { nombre: 'Detergente Bolívar 780g', categoria: 'Limpieza', stock: 13, min: 5, compra: 5.2, venta: 7.5 },
  { nombre: 'Lejía Clorox 1L', categoria: 'Limpieza', stock: 9, min: 4, compra: 2.8, venta: 4.2 },
  { nombre: 'Papel Higiénico Elite x4', categoria: 'Limpieza', stock: 21, min: 6, compra: 4.4, venta: 8.0 },
  { nombre: 'Jabón Bolívar barra', categoria: 'Limpieza', stock: 28, min: 8, compra: 1.6, venta: 2.5 },
  { nombre: 'Lavavajilla Sapolio', categoria: 'Limpieza', stock: 4, min: 5, compra: 3.0, venta: 4.5 },
  // Cuidado personal
  { nombre: 'Cepillo Oral B', categoria: 'Cuidado personal', stock: 15, min: 5, compra: 3.0, venta: 5.5 },
  { nombre: 'Desodorante Rexona', categoria: 'Cuidado personal', stock: 10, min: 4, compra: 6.5, venta: 9.5 },
  { nombre: 'Shampoo Sedal 90ml', categoria: 'Cuidado personal', stock: 12, min: 4, compra: 2.8, venta: 4.5 },
  // Golosinas
  { nombre: 'Galleta Soda Field', categoria: 'Golosinas', stock: 35, min: 10, compra: 0.7, venta: 1.2 },
  { nombre: 'Chocolate Sublime', categoria: 'Golosinas', stock: 42, min: 12, compra: 1.0, venta: 1.8 },
  { nombre: 'Halls Mentol', categoria: 'Golosinas', stock: 50, min: 15, compra: 0.8, venta: 1.5 },
  { nombre: 'Lays Clásicas', categoria: 'Golosinas', stock: 17, min: 6, compra: 1.6, venta: 2.9 },
]

const NOMBRES_CLIENTES = ['Sra. Lucía (vecina)', 'Don Carlos', 'Rosa del 3er piso', 'Pedro taxista']

function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export async function POST() {
  try {
    const { supabase, negocio, error } = await getNegocioFromSession()
    if (error || !negocio) {
      return NextResponse.json({ error: error ?? 'Negocio no encontrado' }, { status: error === 'No autorizado' ? 401 : 404 })
    }

    // Evita duplicar el seed si ya hay inventario cargado.
    const { count } = await supabase
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('negocio_id', negocio.id)

    if ((count ?? 0) > 0) {
      // Aunque ya haya datos, regeneramos la explicación de la semana actual
      // para que use el formato nuevo (resumen + viñetas cortas) en la demo.
      try {
        await recalcularSalud(supabase, negocio, { regenerarExplicacion: true })
      } catch (saludErr) {
        console.error('[POST /api/seed] recalcularSalud (existente)', saludErr)
      }
      return NextResponse.json({ mensaje: 'El negocio ya tiene datos. Explicación actualizada.', productos: count })
    }

    // ── Productos ──
    const { data: productos } = await supabase
      .from('productos')
      .insert(
        INVENTARIO.map((p) => ({
          negocio_id: negocio.id,
          nombre: p.nombre,
          categoria: p.categoria,
          stock_actual: p.stock,
          stock_minimo: p.min,
          precio_compra: p.compra,
          precio_venta: p.venta,
          unidad: 'unidades',
          activo: true,
        }))
      )
      .select()

    const mapaProducto = new Map((productos ?? []).map((p) => [p.nombre, p]))

    // ── Ventas de las últimas 5 semanas (35 días) ──
    let ventasCreadas = 0
    for (let dia = 35; dia >= 0; dia--) {
      // 2 a 5 ventas por día, montos variables (más ventas los fines de semana).
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - dia)
      const esFinde = [0, 6].includes(fecha.getDay())
      const numVentas = (esFinde ? 4 : 2) + Math.floor(Math.random() * 2)

      for (let i = 0; i < numVentas; i++) {
        const elegidos = (productos ?? [])
          .sort(() => Math.random() - 0.5)
          .slice(0, 1 + Math.floor(Math.random() * 3))
        if (!elegidos.length) continue

        const items = elegidos.map((p) => {
          const cantidad = 1 + Math.floor(Math.random() * 4)
          return {
            producto_id: p.id,
            nombre_item: p.nombre,
            cantidad,
            precio_unit: Number(p.precio_venta) || 1,
            subtotal: cantidad * (Number(p.precio_venta) || 1),
          }
        })
        const total = items.reduce((s, it) => s + it.subtotal, 0)

        const { data: v } = await supabase
          .from('ventas')
          .insert({
            negocio_id: negocio.id,
            total,
            canal: 'presencial',
            estado: 'pagado',
            creado_en: diasAtras(dia),
          })
          .select()
          .single()

        if (v) {
          await supabase.from('items_venta').insert(
            items.map((it) => ({ venta_id: v.id, ...it }))
          )
          ventasCreadas++
        }
      }
    }

    // ── Gastos (fijos + variables) ──
    await supabase.from('gastos').insert([
      { negocio_id: negocio.id, descripcion: 'Alquiler del local', monto: 800, categoria: 'alquiler', creado_en: diasAtras(28) },
      { negocio_id: negocio.id, descripcion: 'Luz', monto: 140, categoria: 'servicios', creado_en: diasAtras(20) },
      { negocio_id: negocio.id, descripcion: 'Agua', monto: 60, categoria: 'servicios', creado_en: diasAtras(20) },
      { negocio_id: negocio.id, descripcion: 'Reposición de bebidas', monto: 420, categoria: 'mercaderia', creado_en: diasAtras(14) },
      { negocio_id: negocio.id, descripcion: 'Reposición de abarrotes', monto: 650, categoria: 'mercaderia', creado_en: diasAtras(7) },
      { negocio_id: negocio.id, descripcion: 'Internet', monto: 90, categoria: 'servicios', creado_en: diasAtras(5) },
    ])

    // ── Clientes con fiado ("Te deben") ──
    await supabase.from('clientes').insert(
      NOMBRES_CLIENTES.map((nombre, i) => ({
        negocio_id: negocio.id,
        nombre,
        deuda_total: i < 2 ? [35, 58][i] : 0,
        creado_en: diasAtras(20 - i * 2),
      }))
    )

    // ── Proveedores con deuda ("Debes") ──
    await supabase.from('proveedores').insert([
      { negocio_id: negocio.id, nombre: 'Distribuidora Andina', deuda_total: 240 },
      { negocio_id: negocio.id, nombre: 'Abarrotes El Mayorista', deuda_total: 0 },
    ])

    // Lunes (inicio de semana) de una fecha, para que las semanas del seed
    // coincidan con las que calcula el sistema en vivo (lunes a domingo).
    const lunesDe = (fecha: Date): string => {
      const d = new Date(fecha)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      d.setDate(diff)
      d.setHours(0, 0, 0, 0)
      return d.toISOString().split('T')[0]
    }

    // ── Salud financiera semanal (para la gráfica de evolución) ──
    const scoresSemana: Array<{
      semana: string
      indice: number
      ventas: number
      gastos: number
      margen: number
      componentes: ReturnType<typeof calcularIndiceSalud>['componentes']
    }> = []
    for (let s = 8; s >= 1; s--) {
      const ventas = 1200 + Math.round(Math.random() * 400) + (8 - s) * 30
      const gastos = 300 + Math.round(Math.random() * 120)
      const { indice, margen, componentes } = calcularIndiceSalud({
        ventas,
        gastos,
        ratioDeuda: 0.1,
        diasActivos: 12,
        diasPeriodo: 28,
        coberturaLiquidez: 1.2,
        variacionVentas: 0.05,
      })
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - s * 7)
      scoresSemana.push({
        semana: lunesDe(fecha),
        indice: Math.max(45, indice - s * 2),
        ventas,
        gastos,
        margen,
        componentes,
      })
    }

    for (const sc of scoresSemana) {
      await supabase.from('salud_financiera').upsert(
        {
          negocio_id: negocio.id,
          semana: sc.semana,
          indice: sc.indice,
          ventas_semana: sc.ventas,
          gastos_semana: sc.gastos,
          margen: sc.margen,
          componentes: sc.componentes,
        },
        { onConflict: 'negocio_id,semana' }
      )
    }

    // Calcula la salud de la semana actual a partir de las ventas recién creadas
    // y genera la explicación con el formato nuevo (resumen + viñetas).
    try {
      await recalcularSalud(supabase, negocio, { regenerarExplicacion: true })
    } catch (saludErr) {
      console.error('[POST /api/seed] recalcularSalud', saludErr)
    }

    return NextResponse.json({
      mensaje: 'Datos de demo creados',
      productos: productos?.length ?? 0,
      ventas: ventasCreadas,
      scores: scoresSemana.length,
    })
  } catch (err) {
    console.error('[POST /api/seed]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

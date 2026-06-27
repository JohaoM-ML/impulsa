import { formatSoles } from '@/lib/utils'
import { vocab, type Nivel } from '@/lib/vocabulario'
import type { DashboardResumen } from '@/types'

export interface SegmentoTip {
  texto: string
  /** Si es true, se resalta en negrita */
  fuerte?: boolean
}

export interface Tip {
  emoji: string
  segmentos: SegmentoTip[]
}

/** Texto plano de un tip (útil para accesibilidad / aria-label) */
export function tipATexto(tip: Tip): string {
  return tip.segmentos.map((s) => s.texto).join('')
}

/**
 * Devuelve un tip personalizado según los datos del negocio y el nivel del dueño.
 * Rota a lo largo de los días para que no aparezca siempre lo mismo.
 */
export function seleccionarTip(
  resumen: DashboardResumen | null,
  nivel: Nivel,
  semilla: number = diaDelAnio()
): Tip {
  const candidatos = construirCandidatos(resumen, nivel)
  if (candidatos.length === 0) return tipGenericoBase(nivel)
  const indice = ((semilla % candidatos.length) + candidatos.length) % candidatos.length
  return candidatos[indice]
}

function diaDelAnio(): number {
  return Math.floor(Date.now() / 86_400_000)
}

function construirCandidatos(resumen: DashboardResumen | null, nivel: Nivel): Tip[] {
  const tips: Tip[] = []

  const fiadosTotal = resumen?.fiadosTotal ?? 0
  const fiadosCount = resumen?.fiadosCount ?? 0
  const stockBajo = resumen?.stockBajo ?? 0
  const ganancia = resumen?.gananciasHoy ?? 0
  const ventas = resumen?.totalVentasHoy ?? 0
  const gasto = resumen?.gastoHoy ?? 0
  const productoTop = resumen?.productoTopHoy ?? null

  // ── Tips contextuales (según datos reales) ──
  if (fiadosCount > 0) {
    tips.push({
      emoji: '💸',
      segmentos: [
        { texto: 'Te deben ' },
        { texto: formatSoles(fiadosTotal), fuerte: true },
        {
          texto: ` en ${vocab('deuda_cobrar', nivel)}. Un recordatorio amable por WhatsApp ayuda a cobrar más rápido.`,
        },
      ],
    })
  }

  if (stockBajo > 0) {
    tips.push({
      emoji: '📦',
      segmentos: [
        { texto: 'Tienes ' },
        { texto: `${stockBajo} producto${stockBajo === 1 ? '' : 's'}`, fuerte: true },
        {
          texto: ` ${vocab('inventario_bajo', nivel)}. Revisa ${vocab('abastecer', nivel)} para no quedarte sin vender.`,
        },
      ],
    })
  }

  if (productoTop) {
    tips.push({
      emoji: '⭐',
      segmentos: [
        { texto: 'Hoy lo más vendido fue ' },
        { texto: productoTop.nombre, fuerte: true },
        { texto: '. Tenlo siempre a la mano para no perder ventas.' },
      ],
    })
  }

  if (ganancia > 0) {
    tips.push({
      emoji: '💰',
      segmentos: [
        { texto: 'Hoy ganaste ' },
        { texto: formatSoles(ganancia), fuerte: true },
        { texto: '. Si guardas el ' },
        { texto: '10%', fuerte: true },
        { texto: ', en 3 meses tendrás un colchón para tu negocio.' },
      ],
    })
  }

  if (ventas > 0 && gasto > ventas * 0.7) {
    tips.push({
      emoji: '⚠️',
      segmentos: [
        { texto: 'Hoy ' },
        { texto: vocab('gasto', nivel), fuerte: true },
        { texto: ' se acercó mucho a tus ventas. Revisa en qué se te va el dinero.' },
      ],
    })
  }

  // ── Tips generales (siempre disponibles, también rotan) ──
  tips.push(...tipsGenerales(nivel))

  return tips
}

function tipsGenerales(nivel: Nivel): Tip[] {
  const generales: Tip[] = [
    {
      emoji: '🦙',
      segmentos: [
        { texto: 'Registra tus ventas apenas ocurran: así nunca olvidas ' },
        { texto: 'cuánto vendiste', fuerte: true },
        { texto: '.' },
      ],
    },
    {
      emoji: '🧾',
      segmentos: [
        { texto: 'Anota hasta los gastos pequeños: el delivery y las propinas ' },
        { texto: 'también cuentan', fuerte: true },
        { texto: '.' },
      ],
    },
    {
      emoji: '👛',
      segmentos: [
        { texto: 'Separa el dinero del negocio del dinero de tu casa. ' },
        { texto: 'Tu bolsillo te lo agradecerá', fuerte: true },
        { texto: '.' },
      ],
    },
    {
      emoji: '🔁',
      segmentos: [
        { texto: 'Un cliente que vuelve vale más que uno nuevo: ' },
        { texto: 'trata bien a los de siempre', fuerte: true },
        { texto: '.' },
      ],
    },
  ]

  if (nivel >= 2) {
    generales.push({
      emoji: '📈',
      segmentos: [
        { texto: 'Mira qué producto te deja más ' },
        { texto: vocab('ganancia', nivel), fuerte: true },
        { texto: ', no solo el que más vendes.' },
      ],
    })
    generales.push({
      emoji: '❤️',
      segmentos: [
        { texto: 'Registrar todos los días mejora ' },
        { texto: vocab('salud_financiera', nivel), fuerte: true },
        { texto: '.' },
      ],
    })
  }

  if (nivel >= 3) {
    generales.push({
      emoji: '🎯',
      segmentos: [
        { texto: 'Ponte una meta semanal de ventas y revisa tu avance. ' },
        { texto: 'Lo que se mide, mejora', fuerte: true },
        { texto: '.' },
      ],
    })
  }

  return generales
}

function tipGenericoBase(nivel: Nivel): Tip {
  return tipsGenerales(nivel)[0]
}

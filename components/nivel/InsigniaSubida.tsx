'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NOMBRES_NIVEL, vocab, type Nivel } from '@/lib/vocabulario'

function getInfoNivel(nivel: Exclude<Nivel, 1>) {
  const base: Record<Exclude<Nivel, 1>, { emoji: string; mensaje: string }> = {
    2: {
      emoji: '📈',
      mensaje: 'Ya no solo anotas: empiezas a entender cuánto ganas de verdad.',
    },
    3: {
      emoji: '💼',
      mensaje: `Controlas tus números, tu ${vocab('ganancia', 3)} y tus ${vocab('deuda_cobrar', 3)} como un comerciante.`,
    },
    4: {
      emoji: '🏆',
      mensaje: 'Piensas en crecimiento, crédito y decisiones con datos.',
    },
  }

  const beneficios: Record<Exclude<Nivel, 1>, string[]> = {
    2: [
      'Vocabulario más claro en toda la app',
      'Nuevos módulos de finanzas básicas',
      `Mejor lectura de ${vocab('salud_financiera', 2)}`,
    ],
    3: [
      'Términos financieros más precisos',
      `Módulos sobre tu ${vocab('ganancia', 3)} y ${vocab('flujo_caja', 3)}`,
      'Herramientas avanzadas en Mi Negocio',
    ],
    4: [
      'Vocabulario de empresario en toda la app',
      'Acceso al expediente financiero',
      `Preparación para crédito usando tu ${vocab('salud_financiera', 4)}`,
    ],
  }

  return { ...base[nivel], beneficios: beneficios[nivel] }
}

export function InsigniaSubida({
  nivel,
  nivelAnterior,
  onCerrar,
}: {
  nivel: Nivel
  nivelAnterior?: Nivel
  onCerrar: () => void
}) {
  if (nivel === 1) return null

  const info = getInfoNivel(nivel as Exclude<Nivel, 1>)
  const desde = nivelAnterior && nivelAnterior < nivel ? NOMBRES_NIVEL[nivelAnterior] : null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insignia-subida-titulo"
    >
      <Card className="w-full max-w-[390px] animate-in slide-in-from-bottom-4 border-0 shadow-2xl">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-center gap-2 text-amber-500">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">¡Subiste de nivel!</span>
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="text-center">
            <p className="text-4xl">{info.emoji}</p>
            <p id="insignia-subida-titulo" className="mt-2 text-2xl font-bold text-[#0A3B2A]">
              {desde ? (
                <>
                  {desde}
                  <ArrowRight className="mx-2 inline h-5 w-5 text-primary" />
                  {NOMBRES_NIVEL[nivel]}
                </>
              ) : (
                <>Nivel {nivel}: {NOMBRES_NIVEL[nivel]}</>
              )}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{info.mensaje}</p>
          </div>

          <ul className="space-y-2 rounded-xl bg-muted/50 p-3">
            {info.beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-primary">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <Button className="min-h-[48px] w-full" onClick={onCerrar}>
            ¡Vamos!
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

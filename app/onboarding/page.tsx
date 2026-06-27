'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { BarraXP } from '@/components/nivel/BarraXP'
import { TextoFormateado } from '@/components/shared/TextoFormateado'
import { PasoContacto } from '@/components/onboarding/PasoContacto'
import { PasoGastosFijos } from '@/components/onboarding/PasoGastosFijos'
import { calcularNivel } from '@/lib/nivel'
import { NOMBRES_NIVEL, type Nivel } from '@/lib/vocabulario'
import type { OpcionOnboarding, PreguntaOnboarding } from '@/types'

type EtapaOnboarding = 'contacto' | 'gastos' | 'quiz' | 'resultado'

interface ResultadoOnboarding {
  nivel_nuevo: Nivel
  xp_ganado: number
  perfil_ia?: { explicacion: string; recomendaciones: string[] }
}

function normalizarOpciones(opciones: unknown): OpcionOnboarding[] {
  if (Array.isArray(opciones)) return opciones as OpcionOnboarding[]
  if (typeof opciones === 'string') {
    try {
      const parsed = JSON.parse(opciones)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default function OnboardingPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<EtapaOnboarding>('contacto')
  const [preguntas, setPreguntas] = useState<PreguntaOnboarding[]>([])
  const [paso, setPaso] = useState(0)
  const [respuestas, setRespuestas] = useState<
    Array<{ pregunta_id: string; respuesta: string; xp_ganado: number }>
  >([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoOnboarding | null>(null)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/onboarding')
        if (!res.ok) throw new Error('No se pudieron cargar las preguntas')
        const data = (await res.json()) as PreguntaOnboarding[]
        setPreguntas(
          data.map((p) => ({ ...p, opciones: normalizarOpciones(p.opciones) }))
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const xpAcumulado = Math.min(60, respuestas.reduce((s, r) => s + r.xp_ganado, 0))
  const nivelPreview = calcularNivel(xpAcumulado) as Nivel
  const preguntaActual = preguntas[paso]

  function elegir(opcion: OpcionOnboarding) {
    if (!preguntaActual) return
    const nuevas = [
      ...respuestas.filter((r) => r.pregunta_id !== preguntaActual.id),
      {
        pregunta_id: preguntaActual.id,
        respuesta: opcion.id,
        xp_ganado: opcion.xp,
      },
    ]
    setRespuestas(nuevas)

    if (paso < preguntas.length - 1) {
      setPaso(paso + 1)
    } else {
      finalizar(nuevas)
    }
  }

  async function finalizar(todas: typeof respuestas) {
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas: todas }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'No se pudo guardar el onboarding')
      }
      const data = await res.json()
      setResultado(data)
      setEtapa('resultado')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <EstadoCargando mensaje="Preparando tu perfil..." />
  if (error && etapa !== 'quiz') {
    return <EstadoError mensaje={error} onReintentar={() => window.location.reload()} />
  }

  if (etapa === 'resultado' && resultado) {
    const nivel = resultado.nivel_nuevo
    return (
      <div className="mx-auto min-h-screen max-w-[390px] space-y-4 p-4">
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <CardTitle>¡Listo, ya conocemos tu negocio!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-lg font-semibold text-primary">
              Nivel {nivel}: {NOMBRES_NIVEL[nivel]}
            </p>
            <BarraXP nivel={nivel} xp={resultado.xp_ganado} />
            {resultado.perfil_ia?.explicacion && (
              <TextoFormateado
                texto={resultado.perfil_ia.explicacion}
                className="text-sm text-muted-foreground"
              />
            )}
            {!!resultado.perfil_ia?.recomendaciones?.length && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Para empezar, te sugiero:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {resultado.perfil_ia.recomendaciones.map((rec, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              className="w-full min-h-[48px]"
              onClick={() => {
                router.push('/inicio?tour=1')
                router.refresh()
              }}
            >
              Ir a mi inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (enviando) return <EstadoCargando mensaje="Analizando tus respuestas con IA..." />

  return (
    <div className="mx-auto min-h-screen max-w-[390px] space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold">
          {etapa === 'contacto' && 'Conectemos tu WhatsApp'}
          {etapa === 'gastos' && 'Tus gastos fijos'}
          {etapa === 'quiz' && 'Conozcamos tu negocio'}
        </h1>
        {etapa === 'quiz' && (
          <p className="text-sm text-muted-foreground">
            Pregunta {paso + 1} de {preguntas.length}
          </p>
        )}
      </header>

      {etapa === 'contacto' && (
        <PasoContacto onContinuar={() => setEtapa('gastos')} />
      )}

      {etapa === 'gastos' && (
        <PasoGastosFijos onContinuar={() => setEtapa('quiz')} />
      )}

      {etapa === 'quiz' && (
        <>
          <BarraXP nivel={nivelPreview} xp={xpAcumulado} />
          {!preguntaActual ? (
            <EstadoError mensaje="No hay preguntas disponibles" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{preguntaActual.pregunta}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {preguntaActual.opciones.map((opcion) => (
                  <Button
                    key={opcion.id}
                    variant="outline"
                    className="h-auto min-h-[48px] w-full justify-start whitespace-normal py-3 text-left"
                    disabled={enviando}
                    onClick={() => elegir(opcion)}
                  >
                    {opcion.texto}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  )
}

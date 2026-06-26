'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Award, CheckCircle2, GraduationCap, Lock, PlayCircle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { toast } from '@/hooks/use-toast'
import { notificarCambioNivel } from '@/hooks/useNivel'
import { porcentajeNivelActual } from '@/lib/nivel'
import { NOMBRES_NIVEL, type Nivel } from '@/lib/vocabulario'

interface ModuloAPI {
  id: string
  titulo: string
  contenido: string
  nivel_minimo: number
  xp_recompensa: number
  completado: boolean
  bloqueado: boolean
}

interface ModulosResp {
  nivel: number
  xp_total: number
  modulos: ModuloAPI[]
  completadosCount: number
}

interface OpcionExamen {
  id: string
  texto: string
}

interface PreguntaExamen {
  id: string
  pregunta: string
  opciones: OpcionExamen[]
}

interface DetalleResultado {
  pregunta_id: string
  pregunta: string
  acerto: boolean
  tu_respuesta: string | null
  respuesta_correcta: string
  explicacion: string
}

interface ResultadoExamen {
  aprobado: boolean
  correctas: number
  total: number
  porcentaje: number
  nivel_anterior: number
  nivel_nuevo: number
  subio_nivel: boolean
  xp_ganado: number
  detalle: DetalleResultado[]
}

export default function AprenderPage() {
  const [data, setData] = useState<ModulosResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [completando, setCompletando] = useState(false)

  // Estado del examen de nivel
  const [vista, setVista] = useState<'lista' | 'examen' | 'resultado'>('lista')
  const [preguntas, setPreguntas] = useState<PreguntaExamen[]>([])
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [resultado, setResultado] = useState<ResultadoExamen | null>(null)
  const [cargandoExamen, setCargandoExamen] = useState(false)
  const [enviandoExamen, setEnviandoExamen] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/modulos')
      if (!res.ok) throw new Error('No se pudieron cargar los módulos')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function completar(modulo: ModuloAPI) {
    setCompletando(true)
    try {
      const res = await fetch('/api/modulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo_id: modulo.id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'No se pudo completar')
      const nivelAntes = (data?.nivel ?? 1) as Nivel
      toast({
        title: '¡Módulo completado!',
        description: d.xp_ganado > 0 ? `+${d.xp_ganado} XP` : 'Ya lo habías completado',
      })
      if (d.xp_ganado > 0) {
        const nivelDespues = (d.nivel ?? nivelAntes) as Nivel
        if (nivelDespues > nivelAntes) {
          notificarCambioNivel({ nivelAnterior: nivelAntes, nivelNuevo: nivelDespues })
        } else {
          notificarCambioNivel()
        }
      }
      setAbierto(null)
      cargar()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally {
      setCompletando(false)
    }
  }

  async function iniciarExamen() {
    setCargandoExamen(true)
    try {
      const res = await fetch('/api/examen')
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'No se pudo cargar el examen')
      if (!d.preguntas?.length) throw new Error('Aún no hay preguntas para tu nivel')
      setPreguntas(d.preguntas)
      setRespuestas({})
      setResultado(null)
      setVista('examen')
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      })
    } finally {
      setCargandoExamen(false)
    }
  }

  async function enviarExamen() {
    setEnviandoExamen(true)
    try {
      const res = await fetch('/api/examen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas }),
      })
      const d = (await res.json()) as ResultadoExamen & { error?: string }
      if (!res.ok) throw new Error(d.error || 'No se pudo corregir el examen')
      setResultado(d)
      setVista('resultado')
      if (d.aprobado) {
        if (d.subio_nivel) {
          notificarCambioNivel({
            nivelAnterior: d.nivel_anterior as Nivel,
            nivelNuevo: d.nivel_nuevo as Nivel,
          })
        } else {
          toast({
            title: '¡Examen aprobado!',
            description: d.xp_ganado > 0 ? `+${d.xp_ganado} XP` : undefined,
          })
          notificarCambioNivel()
        }
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      })
    } finally {
      setEnviandoExamen(false)
    }
  }

  function cerrarExamen() {
    setVista('lista')
    setPreguntas([])
    setRespuestas({})
    setResultado(null)
    cargar()
  }

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={cargar} />
  if (!data) return null

  const nivel = (data.nivel as Nivel) ?? 1
  const modulosNivel = data.modulos.filter((m) => m.nivel_minimo === nivel)
  const visibles = modulosNivel.length ? modulosNivel : data.modulos
  const completadosNivel = visibles.filter((m) => m.completado).length
  const pct = porcentajeNivelActual(data.xp_total)
  const examenListo = visibles.length > 0 && completadosNivel >= visibles.length

  // ── Vista: rindiendo el examen ──
  if (vista === 'examen') {
    const todasRespondidas = preguntas.length > 0 && preguntas.every((p) => respuestas[p.id])
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            onClick={cerrarExamen}
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-[#0f3d56]">
            Examen · {NOMBRES_NIVEL[nivel]}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Responde las {preguntas.length} preguntas. Necesitas 60% para aprobar y subir de nivel.
        </p>

        {preguntas.map((p, idx) => (
          <Card key={p.id}>
            <CardContent className="space-y-3 p-4">
              <p className="font-medium leading-tight">
                {idx + 1}. {p.pregunta}
              </p>
              <div className="space-y-2">
                {p.opciones.map((o) => {
                  const elegida = respuestas[p.id] === o.id
                  return (
                    <button
                      key={o.id}
                      onClick={() => setRespuestas((r) => ({ ...r, [p.id]: o.id }))}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${
                        elegida ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          elegida ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40'
                        }`}
                      >
                        {elegida && <CheckCircle2 className="h-4 w-4" />}
                      </span>
                      {o.texto}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          className="w-full min-h-[48px]"
          disabled={!todasRespondidas || enviandoExamen}
          onClick={enviarExamen}
        >
          {enviandoExamen
            ? 'Corrigiendo...'
            : todasRespondidas
              ? 'Entregar examen'
              : 'Responde todas las preguntas'}
        </Button>
      </div>
    )
  }

  // ── Vista: resultado del examen ──
  if (vista === 'resultado' && resultado) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-xl font-bold text-[#0f3d56]">Resultado del examen</h1>

        <Card className={resultado.aprobado ? 'border-emerald-400' : 'border-amber-400'}>
          <CardContent className="space-y-2 p-5 text-center">
            <div className="flex justify-center">
              {resultado.aprobado ? (
                <Award className="h-12 w-12 text-emerald-500" />
              ) : (
                <XCircle className="h-12 w-12 text-amber-500" />
              )}
            </div>
            <p className="text-2xl font-bold">
              {resultado.correctas} / {resultado.total} ({resultado.porcentaje}%)
            </p>
            <p className="text-sm text-muted-foreground">
              {resultado.aprobado
                ? resultado.subio_nivel
                  ? `¡Aprobaste! Subiste a ${NOMBRES_NIVEL[resultado.nivel_nuevo as Nivel]}. +${resultado.xp_ganado} XP`
                  : `¡Aprobaste! +${resultado.xp_ganado} XP`
                : 'No alcanzó esta vez. Repasa los módulos y vuelve a intentarlo.'}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {resultado.detalle.map((d, i) => (
            <Card key={d.pregunta_id} className={d.acerto ? undefined : 'border-amber-300'}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start gap-2">
                  {d.acerto ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <p className="text-sm font-medium leading-tight">
                    {i + 1}. {d.pregunta}
                  </p>
                </div>
                {!d.acerto && (
                  <p className="pl-7 text-xs text-muted-foreground">
                    Tu respuesta: {d.tu_respuesta ?? '—'}
                  </p>
                )}
                <p className="pl-7 text-xs text-emerald-700">
                  Correcta: {d.respuesta_correcta}
                </p>
                {d.explicacion && (
                  <p className="pl-7 text-xs text-muted-foreground">{d.explicacion}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          {!resultado.aprobado && (
            <Button variant="outline" className="flex-1 min-h-[48px]" onClick={iniciarExamen}>
              Reintentar
            </Button>
          )}
          <Button className="flex-1 min-h-[48px]" onClick={cerrarExamen}>
            Volver a Aprender
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-[#0f3d56]">Aprender</h1>

      {/* Nivel actual */}
      <Card className="border-0 bg-[#0f3d56] text-white">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦙</span>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Nivel actual</p>
              <p className="text-xl font-bold">{NOMBRES_NIVEL[nivel]}</p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-white/80">
            {completadosNivel} de {visibles.length} módulos
          </p>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border bg-muted/40 p-3">
        <span className="text-2xl">🦙</span>
        <p className="text-sm text-muted-foreground">
          Completa los módulos. Cada uno suma puntos a tu PymScore.
        </p>
      </div>

      {/* Lista de módulos */}
      <div className="space-y-3">
        {visibles.map((m, i) => {
          const estado = m.completado ? 'completado' : m.bloqueado ? 'bloqueado' : 'disponible'
          const expandido = abierto === m.id
          return (
            <Card
              key={m.id}
              className={m.bloqueado ? 'opacity-60' : undefined}
            >
              <CardContent className="p-4">
                <button
                  className="flex w-full items-center gap-3 text-left"
                  disabled={m.bloqueado}
                  onClick={() => setAbierto(expandido ? null : m.id)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {estado === 'completado' ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : estado === 'bloqueado' ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <span className="text-sm font-bold text-[#0f3d56]">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{m.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {estado === 'completado'
                        ? 'Completado'
                        : estado === 'bloqueado'
                          ? 'Bloqueado'
                          : 'Toca para empezar'}
                    </p>
                  </div>
                  {estado === 'disponible' && <PlayCircle className="h-5 w-5 text-primary" />}
                </button>

                {expandido && !m.bloqueado && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <p className="text-sm text-muted-foreground">{m.contenido}</p>
                    <Button
                      className="w-full min-h-[48px]"
                      disabled={completando}
                      onClick={() => completar(m)}
                    >
                      {completando
                        ? 'Guardando...'
                        : m.completado
                          ? 'Repasar (ya completado)'
                          : `Completar (+${m.xp_recompensa} XP)`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Examen de nivel */}
      <Card className={examenListo ? 'border-primary/40' : 'opacity-60'}>
        <CardContent className="flex items-center gap-3 p-4">
          <GraduationCap className="h-6 w-6 text-[#0f3d56]" />
          <div className="flex-1">
            <p className="font-medium">Examen de nivel</p>
            <p className="text-xs text-muted-foreground">
              {examenListo ? 'Listo para rendir' : 'Completa los módulos primero'}
            </p>
          </div>
          <Button size="sm" disabled={!examenListo || cargandoExamen} onClick={iniciarExamen}>
            {cargandoExamen ? 'Cargando...' : 'Rendir'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

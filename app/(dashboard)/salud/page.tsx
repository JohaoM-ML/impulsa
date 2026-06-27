'use client'

import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FileText, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SaludCircular } from '@/components/salud/SaludCircular'
import { ExplicacionColapsable } from '@/components/shared/ExplicacionColapsable'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { useNivel } from '@/hooks/useNivel'
import type { SaludFinanciera } from '@/types'

interface RespuestaSalud {
  actual: SaludFinanciera | null
  historico: { semana: string; indice: number }[]
}

const ENTIDADES = [
  { nombre: 'Caja Arequipa', tipo: 'Caja Municipal' },
  { nombre: 'EDPYME Alternativa', tipo: 'EDPYME' },
  { nombre: 'FONDEMI', tipo: 'ONG financiera' },
  { nombre: 'Mibanco', tipo: 'Banca para mypes' },
]

const PILARES: { key: keyof NonNullable<SaludFinanciera['componentes']>; label: string }[] = [
  { key: 'rentabilidad', label: 'Rentabilidad' },
  { key: 'liquidez', label: 'Liquidez (cubres tus gastos fijos)' },
  { key: 'deudas', label: 'Manejo de deudas' },
  { key: 'consistencia', label: 'Consistencia (registras seguido)' },
  { key: 'crecimiento', label: 'Crecimiento vs semana pasada' },
]

export default function SaludPage() {
  const { nivel, vocab } = useNivel()
  const [data, setData] = useState<RespuestaSalud | null>(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/salud')
      if (!res.ok) throw new Error('No se pudo cargar tu salud financiera')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function generar() {
    setGenerando(true)
    try {
      const res = await fetch('/api/salud', { method: 'POST' })
      if (!res.ok) throw new Error('No se pudo calcular el índice')
      await cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setGenerando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  if (nivel < 2) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">
          Sube al nivel 2 para desbloquear {vocab('salud_financiera')}.
        </p>
      </div>
    )
  }

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={cargar} />

  const actual = data?.actual ?? null
  const historico = data?.historico ?? []
  const delta =
    historico.length >= 2 ? historico[historico.length - 1].indice - historico[historico.length - 2].indice : 0

  if (!actual) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-bold capitalize text-[#0A3B2A]">{vocab('salud_financiera')}</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4 text-muted-foreground">
              Aún no tienes un índice. Registra ventas y gastos, luego calcúlalo.
            </p>
            <Button className="min-h-[48px]" onClick={generar} disabled={generando}>
              {generando ? 'Calculando...' : 'Calcular mi salud financiera'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const componentes = actual.componentes ?? {}

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold capitalize text-[#0A3B2A]">{vocab('salud_financiera')}</h1>

      <Card className="border-0 bg-[#0A3B2A] text-white">
        <CardContent className="flex flex-col items-center gap-2 p-6">
          <SaludCircular
            indice={actual.indice}
            size={170}
            grosor={14}
            color="#f59e0b"
            colorTexto="#ffffff"
            colorPista="rgba(255,255,255,0.15)"
          />
          {delta !== 0 && (
            <p className="flex items-center gap-1 text-sm font-medium text-emerald-300">
              <TrendingUp className="h-4 w-4" />
              {delta > 0 ? `+${delta}` : delta} esta semana
            </p>
          )}
        </CardContent>
      </Card>

      {actual.explicacion && (
        <Card className="border-amber-300/60 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4">
            <span className="text-2xl">🦙</span>
            <ExplicacionColapsable
              texto={actual.explicacion}
              className="text-sm text-amber-900"
              classNameBoton="text-amber-800"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="font-semibold text-[#0A3B2A]">Cómo se compone tu salud financiera</p>
          {PILARES.map((p) => {
            const valor = Number(componentes[p.key] ?? 0)
            return (
              <div key={p.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{p.label}</span>
                  <span className="font-medium">{valor}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${valor}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {historico.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 font-semibold text-[#0A3B2A]">Evolución de tu salud financiera</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historico.map((h, i) => ({ ...h, etiqueta: `S${i + 1}` }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip />
                  <Line type="monotone" dataKey="indice" stroke="#f59e0b" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <p className="font-bold">Reporte de Salud Financiera</p>
          </div>
          <p className="text-sm">
            {nivel >= 3
              ? 'Genera un reporte con tu historial para compartir con una microfinanciera.'
              : 'Sigue mejorando tu salud financiera para generar tu reporte.'}
          </p>
          <Button className="w-full bg-[#0A3B2A] text-white hover:bg-[#0A3B2A]/90" disabled={nivel < 3}>
            <FileText className="h-4 w-4" /> Generar mi reporte
          </Button>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Entidades aliadas
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ENTIDADES.map((e) => (
            <Card key={e.nombre}>
              <CardContent className="p-3">
                <p className="text-sm font-semibold">{e.nombre}</p>
                <p className="text-xs text-muted-foreground">{e.tipo}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Button variant="outline" className="w-full min-h-[48px]" onClick={generar} disabled={generando}>
        {generando ? 'Recalculando...' : 'Recalcular salud financiera'}
      </Button>
    </div>
  )
}

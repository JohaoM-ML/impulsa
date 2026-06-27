'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatSoles, cn } from '@/lib/utils'
import type { FlujoResumen, FlujoSemana, Nivel, PeriodoFlujo } from '@/types'

interface Props {
  nivel: Nivel
  data: FlujoResumen
}

const ventaColor = 'hsl(153 69% 39%)'
const gastoColor = 'hsl(0 84% 60%)'
const gananciaColor = 'hsl(217 91% 60%)'

const COPY_PERIODO: Record<
  PeriodoFlujo,
  {
    actual: string
    actualCapital: string
    anterior: string
    gastoNegativo: string
    panel: string
  }
> = {
  dia: {
    actual: 'hoy',
    actualCapital: 'Hoy',
    anterior: 'ayer',
    gastoNegativo: 'Hoy gastaste más de lo que vendiste.',
    panel: 'Panel financiero de hoy',
  },
  semana: {
    actual: 'esta semana',
    actualCapital: 'Esta semana',
    anterior: 'la semana pasada',
    gastoNegativo: 'Esta semana gastaste más de lo que vendiste.',
    panel: 'Panel financiero semanal',
  },
  mes: {
    actual: 'este mes',
    actualCapital: 'Este mes',
    anterior: 'el mes pasado',
    gastoNegativo: 'Este mes gastaste más de lo que vendiste.',
    panel: 'Panel financiero mensual',
  },
}

function ultimaSemana(serie: FlujoSemana[]): FlujoSemana {
  return serie[serie.length - 1] ?? {
    semana: 'Esta semana',
    ventas: 0,
    costoMercaderia: 0,
    gananciaBruta: 0,
    gastosFijos: 0,
    gananciaNeta: 0,
    gastos: 0,
  }
}

function proyeccionSimple(serie: FlujoSemana[]): number {
  const ultimas = serie.slice(-3)
  if (!ultimas.length) return 0
  return Math.round(ultimas.reduce((s, p) => s + p.ventas, 0) / ultimas.length)
}

function BarraSimple({ label, monto, max, tono }: { label: string; monto: number; max: number; tono: 'venta' | 'gasto' }) {
  const pct = max > 0 ? Math.max(8, Math.min(100, (monto / max) * 100)) : 0
  const ancho =
    pct >= 95
      ? 'w-full'
      : pct >= 75
        ? 'w-3/4'
        : pct >= 50
          ? 'w-1/2'
          : pct >= 25
            ? 'w-1/4'
            : 'w-[10%]'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-brand-dark">{label}</span>
        <span className={tono === 'venta' ? 'text-primary' : 'text-destructive'}>{formatSoles(monto)}</span>
      </div>
      <div className="h-5 rounded-full bg-muted">
        <div
          className={cn('h-5 rounded-full', ancho, tono === 'venta' ? 'bg-primary' : 'bg-destructive')}
        />
      </div>
    </div>
  )
}

// Nota que aclara que los gastos fijos del mes (alquiler, luz) se muestran
// repartidos por periodo, no como un golpe que "salió" todo de una vez.
function NotaGastoFijo({ data }: { data: FlujoResumen }) {
  if (!data.gastoFijoMensual || data.gastoFijoMensual <= 0) return null
  const copy = COPY_PERIODO[data.periodo]
  return (
    <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
      💡 Tu alquiler, luz y demás gastos fijos son <b>{formatSoles(data.gastoFijoMensual)} al mes</b>.
      Aquí repartimos solo la parte de {copy.actual} (≈ {formatSoles(data.gastoFijoSemanal)}), porque
      eso se paga una vez al mes, no de golpe.
    </p>
  )
}

function GraficoNivel1({ data }: { data: FlujoResumen }) {
  const semana = ultimaSemana(data.serie)
  const quedo = semana.ventas - semana.gastos
  const max = Math.max(semana.ventas, semana.gastos)
  const mejor = data.comparacion.delta >= 0
  const copy = COPY_PERIODO[data.periodo]

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <p className="font-semibold text-brand-dark">¿Cómo te fue {copy.actual}?</p>
          <p className="text-sm text-muted-foreground">Mira cuánto entró, cuánto salió y cuánto te quedó.</p>
        </div>
        <div className="rounded-2xl bg-brand-tint p-4 text-center">
          <p className="text-sm text-muted-foreground">Te quedó</p>
          <p className={cn('text-3xl font-bold', quedo >= 0 ? 'text-primary' : 'text-destructive')}>
            {formatSoles(quedo)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {quedo >= 0 ? 'Vas bien, cuida tus gastos.' : copy.gastoNegativo}
          </p>
        </div>
        <BarraSimple label="Entró por ventas" monto={semana.ventas} max={max} tono="venta" />
        <BarraSimple label="Salió del negocio" monto={semana.gastos} max={max} tono="gasto" />
        <NotaGastoFijo data={data} />
        <p className={cn('flex items-center gap-1 text-sm font-medium', mejor ? 'text-primary' : 'text-destructive')}>
          {mejor ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {mejor ? `Mejor que ${copy.anterior}` : `Más bajo que ${copy.anterior}`}
        </p>
      </CardContent>
    </Card>
  )
}

function GraficoNivel2({ data }: { data: FlujoResumen }) {
  const mejor = data.comparacion.delta >= 0
  const copy = COPY_PERIODO[data.periodo]
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold text-brand-dark">Ventas y gastos</p>
          <p className="text-sm text-muted-foreground">
            {mejor
              ? `${copy.actualCapital} te fue mejor que ${copy.anterior}.`
              : `${copy.actualCapital} te quedó menos que ${copy.anterior}.`}
          </p>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.serie.slice(-4)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => formatSoles(v)} />
              <Legend />
              <Bar dataKey="ventas" name="Ventas" fill={ventaColor} radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill={gastoColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <NotaGastoFijo data={data} />
      </CardContent>
    </Card>
  )
}

// Nota técnica para niveles altos: los costos fijos se prorratean por periodo.
function NotaGastoFijoTecnica({ data }: { data: FlujoResumen }) {
  if (!data.gastoFijoMensual || data.gastoFijoMensual <= 0) return null
  const copy = COPY_PERIODO[data.periodo]
  return (
    <p className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
      Tus costos fijos ({formatSoles(data.gastoFijoMensual)}/mes) se prorratean para {copy.actual}
      (≈ {formatSoles(data.gastoFijoSemanal)}) para no distorsionar el resultado del periodo.
    </p>
  )
}

function GraficoNivel3({ data }: { data: FlujoResumen }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-1 font-semibold text-brand-dark">Tendencia y ganancia</p>
        <p className="mb-3 text-sm text-muted-foreground">Ventas como barras y ganancia como línea.</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.serie}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => formatSoles(v)} />
              <Legend />
              <Bar dataKey="ventas" name="Ventas" fill={ventaColor} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="gananciaNeta" name="Ganancia" stroke={gananciaColor} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <NotaGastoFijoTecnica data={data} />
      </CardContent>
    </Card>
  )
}

function GraficoNivel4({ data }: { data: FlujoResumen }) {
  const margen = data.totalVentas > 0 ? (data.gananciaNeta / data.totalVentas) * 100 : 0
  const proyeccion = proyeccionSimple(data.serie)
  const copy = COPY_PERIODO[data.periodo]
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-brand-dark">{copy.panel}</p>
            <p className="text-sm text-muted-foreground">Ventas, gastos, ganancia neta y tendencia.</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Margen: {margen.toFixed(1)}%</p>
            <p>Proy.: {formatSoles(proyeccion)}</p>
          </div>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.serie}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => formatSoles(v)} />
              <Legend />
              <Line type="monotone" dataKey="ventas" name="Ventas" stroke={ventaColor} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gananciaNeta" name="Ganancia neta" stroke={gananciaColor} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gastos" name="Gastos" stroke={gastoColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <NotaGastoFijoTecnica data={data} />
      </CardContent>
    </Card>
  )
}

export function GraficoFlujoAdaptativo({ nivel, data }: Props) {
  if (nivel === 1) return <GraficoNivel1 data={data} />
  if (nivel === 2) return <GraficoNivel2 data={data} />
  if (nivel === 3) return <GraficoNivel3 data={data} />
  return <GraficoNivel4 data={data} />
}

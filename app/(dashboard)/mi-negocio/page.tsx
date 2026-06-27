'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Search, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { EstadoVacio } from '@/components/estados/EstadoVacio'
import { PageHeader } from '@/components/shared/PageHeader'
import { useNivel } from '@/hooks/useNivel'
import { toast } from '@/hooks/use-toast'
import { calcularGanancia } from '@/lib/finanzas'
import { etiquetaPeriodo, type PeriodoAbastecimiento } from '@/lib/abastecimiento'
import { formatSoles, cn } from '@/lib/utils'
import type { AbastecimientoResumen, Cliente, Producto, Proveedor, TopProductoItem, TopResumen } from '@/types'

interface FlujoData {
  serie: { semana: string; ventas: number; gastos: number }[]
  totalVentas: number
  totalGastos: number
  totalCosto: number
  totalGastosRegistrados: number
}

type VistaTop = 'cantidad' | 'ingresos' | 'sin_ventas'
type PeriodoTop = '7d' | '30d' | '90d' | 'todo'

// Capitaliza la primera letra de un término del vocabulario para usarlo como etiqueta.
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const PERIODOS: { value: PeriodoAbastecimiento; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
]

function SelectorPeriodo({
  periodo,
  onChange,
}: {
  periodo: PeriodoAbastecimiento
  onChange: (p: PeriodoAbastecimiento) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {PERIODOS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium',
            periodo === p.value ? 'bg-brand-dark text-white' : 'bg-background text-muted-foreground'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

export default function MiNegocioPage() {
  return (
    <div className="space-y-4 p-4">
      <PageHeader
        eyebrow="Entender"
        title="Mi Negocio"
        description="Mira tu flujo, inventario, productos top y fiados en un solo lugar."
      />
      <Tabs defaultValue="flujo">
        <TabsList>
          <TabsTrigger value="flujo">Flujo</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="top">Top</TabsTrigger>
          <TabsTrigger value="fiado">Fiado</TabsTrigger>
        </TabsList>
        <TabsContent value="flujo">
          <TabFlujo />
        </TabsContent>
        <TabsContent value="inventario">
          <TabInventario />
        </TabsContent>
        <TabsContent value="top">
          <TabTop />
        </TabsContent>
        <TabsContent value="fiado">
          <TabFiado />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ───────────────────────── Flujo ─────────────────────────
function TabFlujo() {
  const { vocab } = useNivel()
  const [data, setData] = useState<FlujoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch('/api/mi-negocio/flujo')
      .then((r) => {
        if (!r.ok) throw new Error('fetch flujo')
        return r.json()
      })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje="No pudimos cargar tu flujo de caja." onReintentar={cargar} />
  if (!data) return <EstadoVacio mensaje="Aún no hay movimientos para mostrar." />

  const positivo = data.totalVentas >= data.totalGastos
  const ganancia = calcularGanancia(data.totalVentas, data.totalGastos)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 items-stretch gap-2">
        <Card className="min-w-0">
          <CardContent className="flex h-full flex-col justify-between gap-1 p-2.5">
            <p className="min-h-[2.2em] text-[11px] uppercase leading-tight text-muted-foreground">Ventas</p>
            <p className="whitespace-nowrap text-[13px] font-bold leading-tight tracking-tight tabular-nums text-primary">
              {formatSoles(data.totalVentas)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="flex h-full flex-col justify-between gap-1 p-2.5">
            <p className="min-h-[2.2em] text-[11px] uppercase leading-tight text-muted-foreground">{cap(vocab('gasto'))}</p>
            <p className="whitespace-nowrap text-[13px] font-bold leading-tight tracking-tight tabular-nums text-destructive">
              {formatSoles(data.totalGastos)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="flex h-full flex-col justify-between gap-1 p-2.5">
            <p className="min-h-[2.2em] text-[11px] uppercase leading-tight text-muted-foreground">{cap(vocab('ganancia'))}</p>
            <p className={cn('whitespace-nowrap text-[13px] font-bold leading-tight tracking-tight tabular-nums', ganancia >= 0 ? 'text-emerald-600' : 'text-destructive')}>
              {formatSoles(ganancia)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted">
        <CardContent className="p-3 text-xs text-muted-foreground">
          {cap(vocab('gasto'))} incluye el <b>costo de la mercadería que vendiste</b> ({formatSoles(data.totalCosto)})
          {data.totalGastosRegistrados > 0 && (
            <> más tus gastos registrados ({formatSoles(data.totalGastosRegistrados)})</>
          )}.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 font-semibold text-brand-dark">Ventas vs {cap(vocab('gasto'))} (semanal)</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.serie}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v: number) => formatSoles(v)} />
                <Legend />
                <Line type="monotone" dataKey="ventas" name="Ventas" stroke="hsl(153 69% 39%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gastos" name={cap(vocab('gasto'))} stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="text-2xl">🦙</span>
          <p className="text-sm">
            {positivo ? (
              <>
                ¡Bien! Vendiste más de lo que gastaste. Tu {vocab('flujo_caja')} está <b>positivo</b>.
              </>
            ) : (
              <>
                Cuidado: gastaste más de lo que vendiste. Revisa {vocab('gasto')}.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────── Inventario ─────────────────────────
function TabInventario() {
  const { vocab } = useNivel()
  const [productos, setProductos] = useState<Producto[]>([])
  const [abastecimiento, setAbastecimiento] = useState<AbastecimientoResumen | null>(null)
  const [periodo, setPeriodo] = useState<PeriodoAbastecimiento>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [verSoloAbastecer, setVerSoloAbastecer] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    setError(false)
    Promise.all([
      fetch('/api/inventario').then((r) => {
        if (!r.ok) throw new Error('fetch inventario')
        return r.json()
      }),
      fetch(`/api/mi-negocio/abastecimiento?periodo=${periodo}`).then((r) => {
        if (!r.ok) throw new Error('fetch abastecimiento')
        return r.json()
      }),
    ])
      .then(([inv, abas]) => {
        setProductos(Array.isArray(inv) ? inv : [])
        setAbastecimiento(abas)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [periodo])

  useEffect(() => {
    cargar()
  }, [cargar])

  const categorias = useMemo(() => {
    const set = new Set<string>()
    productos.forEach((p) => p.categoria && set.add(p.categoria))
    return ['Todos', ...Array.from(set)]
  }, [productos])

  const idsAbastecer = useMemo(
    () => new Set((abastecimiento?.productos ?? []).map((p) => p.id)),
    [abastecimiento]
  )

  const filtrados = productos.filter((p) => {
    const okCat = categoria === 'Todos' || p.categoria === categoria
    const okBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const okAbas = !verSoloAbastecer || idsAbastecer.has(p.id)
    return okCat && okBusq && okAbas
  })

  const stockBajo = productos.filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo))

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje="No pudimos cargar tu inventario." onReintentar={cargar} />
  if (!productos.length) {
    return <EstadoVacio mensaje="Aún no tienes productos en tu inventario." accionHref="/registrar" accionLabel="Registrar productos" />
  }

  return (
    <div className="space-y-3">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-2 font-semibold text-brand-dark">
                <ShoppingCart className="h-4 w-4" />
                {cap(vocab('abastecer'))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Según lo que vendiste en los últimos {etiquetaPeriodo(periodo)}
              </p>
            </div>
          </div>

          <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-background p-2.5">
              <p className="text-[11px] uppercase text-muted-foreground">{cap(vocab('inventario_bajo'))}</p>
              <p className="text-lg font-bold text-amber-600">{abastecimiento?.productos_stock_bajo ?? stockBajo.length}</p>
            </div>
            <div className="rounded-lg border bg-background p-2.5">
              <p className="text-[11px] uppercase text-muted-foreground">Unidades a pedir</p>
              <p className="text-lg font-bold text-brand-dark">{abastecimiento?.unidades_sugeridas ?? 0}</p>
            </div>
          </div>

          {(abastecimiento?.costo_estimado_total ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">
              Costo estimado de compra: <b className="text-foreground">{formatSoles(abastecimiento?.costo_estimado_total ?? 0)}</b>
            </p>
          )}

          {(abastecimiento?.productos.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {abastecimiento!.productos.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border bg-background p-2.5 text-sm',
                    p.stock_bajo && 'border-l-4 border-l-amber-400'
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-medium">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Tienes {p.stock_actual} · Vendiste {p.vendido_periodo} {p.unidad}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-primary">+{p.sugerencia_pedido}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">pedir</p>
                  </div>
                </div>
              ))}
              {abastecimiento!.productos.length > 5 && (
                <button
                  type="button"
                  onClick={() => setVerSoloAbastecer(true)}
                  className="w-full text-center text-xs font-medium text-primary"
                >
                  Ver los {abastecimiento!.productos.length} productos en la lista ↓
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Por ahora tu stock alcanza según tus ventas recientes. ¡Sigue registrando!
            </p>
          )}
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto"
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categorias.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoria(c)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium',
              categoria === c ? 'bg-brand-dark text-white' : 'bg-background text-muted-foreground'
            )}
          >
            {c} {c === 'Todos' && `· ${productos.length}`}
          </button>
        ))}
      </div>

      {verSoloAbastecer && (
        <button
          type="button"
          onClick={() => setVerSoloAbastecer(false)}
          className="text-xs font-medium text-primary"
        >
          ← Ver todo el inventario
        </button>
      )}

      {stockBajo.length > 0 && !verSoloAbastecer && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 text-sm">
            <b>{stockBajo.length}</b> productos con {vocab('inventario_bajo')}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtrados.map((p) => {
          const bajo = Number(p.stock_actual) <= Number(p.stock_minimo)
          const sugerencia = abastecimiento?.productos.find((a) => a.id === p.id)
          return (
            <Card key={p.id} className={bajo ? 'border-l-4 border-l-amber-400' : undefined}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0 pr-2">
                  <p className="font-medium leading-tight">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Costo {formatSoles(Number(p.precio_compra ?? 0))} · Venta {formatSoles(Number(p.precio_venta ?? 0))}
                  </p>
                  {sugerencia && sugerencia.sugerencia_pedido > 0 && (
                    <p className="mt-1 text-xs text-primary">
                      Sugerencia: pedir {sugerencia.sugerencia_pedido} {p.unidad}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('text-lg font-bold', bajo ? 'text-amber-600' : 'text-brand-dark')}>
                    {p.stock_actual}
                  </p>
                  <p className="text-[10px] uppercase text-muted-foreground">stock</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {!filtrados.length && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {verSoloAbastecer ? 'Ningún producto coincide con tu búsqueda.' : 'Sin productos.'}
          </p>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Top ─────────────────────────
const PERIODOS_TOP: { id: PeriodoTop; label: string }[] = [
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: '90d', label: '3 meses' },
  { id: 'todo', label: 'Todo' },
]

const VISTAS_TOP: { id: VistaTop; label: string; icon: typeof TrendingUp }[] = [
  { id: 'cantidad', label: 'Para pedir', icon: TrendingUp },
  { id: 'ingresos', label: 'Por ingresos', icon: TrendingUp },
  { id: 'sin_ventas', label: 'No se vende', icon: TrendingDown },
]

function TabTop() {
  const { nivel, vocab } = useNivel()
  const [data, setData] = useState<TopResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [vista, setVista] = useState<VistaTop>('cantidad')
  const [periodo, setPeriodo] = useState<PeriodoTop>('30d')
  const [categoria, setCategoria] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch(`/api/mi-negocio/top?periodo=${periodo}`)
      .then((r) => {
        if (!r.ok) throw new Error('fetch top')
        return r.json()
      })
      .then((d: TopResumen) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [periodo])

  useEffect(() => {
    cargar()
  }, [cargar])

  const categorias = useMemo(() => {
    if (!data) return ['Todos']
    return ['Todos', ...data.categorias]
  }, [data])

  const listaBase = useMemo((): TopProductoItem[] => {
    if (!data) return []
    if (vista === 'cantidad') return data.porCantidad
    if (vista === 'ingresos') return data.porIngresos
    return data.sinVentas
  }, [data, vista])

  const filtrados = useMemo(() => {
    return listaBase.filter((p) => {
      const okCat = categoria === 'Todos' || p.categoria === categoria
      const okBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      return okCat && okBusq
    })
  }, [listaBase, categoria, busqueda])

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje="No pudimos cargar tus productos top." onReintentar={cargar} />
  if (!data) return <EstadoVacio mensaje="Aún no hay datos suficientes." />

  const periodoLabel = PERIODOS_TOP.find((p) => p.id === periodo)?.label ?? periodo

  return (
    <div className="space-y-3">
      {/* Vista principal */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {VISTAS_TOP.map((v) => {
          const Icon = v.icon
          return (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium min-h-[40px]',
                vista === v.id ? 'bg-brand-dark text-white' : 'bg-background text-muted-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {v.label}
            </button>
          )
        })}
      </div>

      {/* Periodo */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODOS_TOP.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium',
              periodo === p.id ? 'border-primary bg-primary/10 text-primary' : 'bg-background text-muted-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto"
          className="pl-9"
        />
      </div>

      {categorias.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium',
                categoria === c ? 'bg-brand-dark text-white' : 'bg-background text-muted-foreground'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <p className="mb-1 text-sm font-semibold text-brand-dark">
            {vista === 'cantidad' && `Más vendidos por cantidad · ${periodoLabel}`}
            {vista === 'ingresos' && `Más vendidos por ingresos · ${periodoLabel}`}
            {vista === 'sin_ventas' && `Sin ventas en ${periodoLabel.toLowerCase()}`}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {vista === 'cantidad' && 'Ordenado por unidades vendidas. Te sugerimos cuánto pedir según tu stock.'}
            {vista === 'ingresos' && 'Ordenado por plata que generó cada producto.'}
            {vista === 'sin_ventas' && 'Productos en tu inventario que no tuvieron ventas en este periodo.'}
          </p>

          <div className="space-y-2">
            {filtrados.map((p, i) => (
              <div
                key={`${p.id ?? p.nombre}-${i}`}
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  vista === 'sin_ventas' && 'border-amber-200 bg-amber-50/50',
                  vista !== 'sin_ventas' && p.stock_bajo && 'border-l-4 border-l-amber-400'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium leading-tight">
                    {vista !== 'sin_ventas' && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                        {i + 1}
                      </span>
                    )}
                    {p.nombre}
                  </span>
                  {vista === 'ingresos' && (
                    <span className="shrink-0 font-semibold text-primary">{formatSoles(p.ingresos)}</span>
                  )}
                  {vista === 'cantidad' && (
                    <span className="shrink-0 font-semibold text-primary">
                      {p.cantidad} {p.unidad}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {vista !== 'sin_ventas' && vista !== 'cantidad' && (
                    <span>{p.cantidad} {p.unidad} vendidas</span>
                  )}
                  {vista === 'cantidad' && (
                    <span>Ingresos: {formatSoles(p.ingresos)}</span>
                  )}
                  {vista === 'ingresos' && (
                    <span>{p.cantidad} {p.unidad} vendidas</span>
                  )}
                  <span>
                    Stock: <b className={p.stock_bajo ? 'text-amber-600' : 'text-foreground'}>{p.stock_actual}</b>
                  </span>
                  {p.categoria && <span>{p.categoria}</span>}
                </div>

                {vista === 'cantidad' && p.sugerencia_pedido > 0 && (
                  <p className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    Sugerencia: pedir <b>{p.sugerencia_pedido}</b> {p.unidad}
                    {p.stock_bajo && ` · ${cap(vocab('inventario_bajo'))}`}
                  </p>
                )}

                {vista === 'sin_ventas' && (
                  <p className="mt-2 text-xs text-amber-700">
                    Tienes <b>{p.stock_actual}</b> {p.unidad} en stock sin movimiento.
                  </p>
                )}
              </div>
            ))}

            {!filtrados.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {vista === 'sin_ventas'
                  ? '¡Bien! Todos tus productos tuvieron ventas en este periodo.'
                  : 'Aún sin ventas en este periodo.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {nivel >= 3 && data.masRentables.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 font-semibold text-brand-dark">💎 Más rentables (margen)</p>
            <div className="space-y-2">
              {data.masRentables.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between text-sm">
                  <span>{p.nombre}</span>
                  <span className="font-semibold text-brand-dark">{p.margen}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ───────────────────────── Fiado ─────────────────────────
function TabFiado() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [c, p] = await Promise.all([
        fetch('/api/clientes').then((r) => {
          if (!r.ok) throw new Error('fetch clientes')
          return r.json()
        }),
        fetch('/api/proveedores').then((r) => {
          if (!r.ok) throw new Error('fetch proveedores')
          return r.json()
        }),
      ])
      setClientes(Array.isArray(c) ? c : [])
      setProveedores(Array.isArray(p) ? p : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function marcarPagadoCliente(id: string) {
    try {
      const res = await fetch('/api/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, deuda_total: 0 }),
      })
      if (!res.ok) throw new Error('patch cliente')
      toast({ title: 'Deuda saldada' })
      cargar()
    } catch {
      toast({ title: 'No se pudo saldar la deuda', variant: 'destructive' })
    }
  }

  async function marcarPagadoProveedor(id: string) {
    try {
      const res = await fetch('/api/proveedores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, deuda_total: 0 }),
      })
      if (!res.ok) throw new Error('patch proveedor')
      toast({ title: 'Pago registrado' })
      cargar()
    } catch {
      toast({ title: 'No se pudo registrar el pago', variant: 'destructive' })
    }
  }

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje="No pudimos cargar tus fiados." onReintentar={cargar} />

  const teDeben = clientes.filter((c) => Number(c.deuda_total) > 0)
  const debes = proveedores.filter((p) => Number(p.deuda_total) > 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 font-semibold text-primary">
            <TrendingUp className="h-4 w-4" /> Te deben
          </p>
          {teDeben.map((c) => (
            <div key={c.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    desde {new Date(c.creado_en).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <span className="font-bold text-primary">{formatSoles(Number(c.deuda_total))}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" disabled>
                  Recordar
                </Button>
                <ConfirmarPago
                  trigger={
                    <Button size="sm" className="w-full">
                      Pagado
                    </Button>
                  }
                  titulo="¿Marcar deuda como pagada?"
                  descripcion={`Vas a saldar la deuda de ${c.nombre} (${formatSoles(Number(c.deuda_total))}). Esta acción pone su saldo en cero.`}
                  onConfirmar={() => marcarPagadoCliente(c.id)}
                />
              </div>
            </div>
          ))}
          {!teDeben.length && <p className="text-sm text-muted-foreground">Nadie te debe. ¡Bien!</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <TrendingDown className="h-4 w-4" /> Debes
          </p>
          {debes.map((p) => (
            <div key={p.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.nombre}</p>
                </div>
                <span className="font-bold text-destructive">{formatSoles(Number(p.deuda_total))}</span>
              </div>
              <ConfirmarPago
                trigger={
                  <Button size="sm" variant="outline">
                    Marcar pagado
                  </Button>
                }
                titulo="¿Marcar como pagado?"
                descripcion={`Vas a registrar el pago a ${p.nombre} (${formatSoles(Number(p.deuda_total))}). Esta acción pone tu deuda en cero.`}
                onConfirmar={() => marcarPagadoProveedor(p.id)}
              />
            </div>
          ))}
          {!debes.length && <p className="text-sm text-muted-foreground">No le debes a nadie.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// Diálogo de confirmación reutilizable para saldar deudas (acción difícil de revertir).
function ConfirmarPago({
  trigger,
  titulo,
  descripcion,
  onConfirmar,
}: {
  trigger: ReactNode
  titulo: string
  descripcion: string
  onConfirmar: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>Sí, confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

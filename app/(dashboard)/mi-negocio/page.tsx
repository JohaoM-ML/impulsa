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
import { Search, TrendingDown, TrendingUp } from 'lucide-react'
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
import { formatSoles, cn } from '@/lib/utils'
import type { Cliente, Producto, Proveedor } from '@/types'

interface FlujoData {
  serie: { semana: string; ventas: number; gastos: number }[]
  totalVentas: number
  totalGastos: number
  totalCosto: number
  totalGastosRegistrados: number
}
interface TopData {
  masVendidos: { nombre: string; ingresos: number; cantidad: number }[]
  masRentables: { nombre: string; margen: number }[]
}

// Capitaliza la primera letra de un término del vocabulario para usarlo como etiqueta.
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Ventas</p>
            <p className="text-lg font-bold text-primary">{formatSoles(data.totalVentas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] uppercase text-muted-foreground">{cap(vocab('gasto'))}</p>
            <p className="text-lg font-bold text-destructive">{formatSoles(data.totalGastos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] uppercase text-muted-foreground">{cap(vocab('ganancia'))}</p>
            <p className={cn('text-lg font-bold', ganancia >= 0 ? 'text-emerald-600' : 'text-destructive')}>
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')

  const cargar = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch('/api/inventario')
      .then((r) => {
        if (!r.ok) throw new Error('fetch inventario')
        return r.json()
      })
      .then((d) => setProductos(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const categorias = useMemo(() => {
    const set = new Set<string>()
    productos.forEach((p) => p.categoria && set.add(p.categoria))
    return ['Todos', ...Array.from(set)]
  }, [productos])

  const filtrados = productos.filter((p) => {
    const okCat = categoria === 'Todos' || p.categoria === categoria
    const okBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return okCat && okBusq
  })

  const stockBajo = productos.filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo))

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje="No pudimos cargar tu inventario." onReintentar={cargar} />
  if (!productos.length) {
    return <EstadoVacio mensaje="Aún no tienes productos en tu inventario." accionHref="/registrar" accionLabel="Registrar productos" />
  }

  return (
    <div className="space-y-3">
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

      {stockBajo.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 text-sm">
            <b>{stockBajo.length}</b> {vocab('inventario_bajo')}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtrados.map((p) => {
          const bajo = Number(p.stock_actual) <= Number(p.stock_minimo)
          return (
            <Card key={p.id} className={bajo ? 'border-l-4 border-l-amber-400' : undefined}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium leading-tight">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Costo {formatSoles(Number(p.precio_compra ?? 0))} · Venta {formatSoles(Number(p.precio_venta ?? 0))}
                  </p>
                </div>
                <div className="text-right">
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
          <p className="py-8 text-center text-sm text-muted-foreground">Sin productos.</p>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Top ─────────────────────────
function TabTop() {
  const [data, setData] = useState<TopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch('/api/mi-negocio/top')
      .then((r) => {
        if (!r.ok) throw new Error('fetch top')
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
  if (error) return <EstadoError mensaje="No pudimos cargar tus productos top." onReintentar={cargar} />
  if (!data) return <EstadoVacio mensaje="Aún no hay datos suficientes." />

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="mb-3 flex items-center gap-2 font-semibold text-primary">
            <TrendingUp className="h-4 w-4" /> Más vendidos (ingresos)
          </p>
          <div className="space-y-2">
            {data.masVendidos.map((p, i) => (
              <div key={p.nombre} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                    {i + 1}
                  </span>
                  {p.nombre}
                </span>
                <span className="font-semibold text-primary">{formatSoles(p.ingresos)}</span>
              </div>
            ))}
            {!data.masVendidos.length && <p className="text-sm text-muted-foreground">Aún sin ventas.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 flex items-center gap-2 font-semibold text-brand-dark">💎 Más rentables (margen)</p>
          <div className="space-y-2">
            {data.masRentables.map((p) => (
              <div key={p.nombre} className="flex items-center justify-between text-sm">
                <span>{p.nombre}</span>
                <span className="font-semibold text-brand-dark">{p.margen}%</span>
              </div>
            ))}
            {!data.masRentables.length && (
              <p className="text-sm text-muted-foreground">Agrega costos y precios para ver tu margen.</p>
            )}
          </div>
        </CardContent>
      </Card>
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

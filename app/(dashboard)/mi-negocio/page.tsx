'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Search, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { GraficoFlujoAdaptativo } from '@/components/dashboard/GraficoFlujoAdaptativo'
import { PageHeader } from '@/components/shared/PageHeader'
import { useNivel } from '@/hooks/useNivel'
import { toast } from '@/hooks/use-toast'
import { etiquetaPeriodo, type PeriodoAbastecimiento } from '@/lib/abastecimiento'
import { etiquetaMedioPago, MEDIOS_PAGO, normalizarMediosPago } from '@/lib/medios-pago'
import { formatSoles, cn } from '@/lib/utils'
import type {
  AbastecimientoResumen,
  Cliente,
  CompraInteligenteProducto,
  CompraInteligenteResumen,
  FlujoResumen,
  MedioPago,
  Producto,
  Proveedor,
  TopProductoItem,
  TopResumen,
} from '@/types'

type VistaTop = 'cantidad' | 'ingresos' | 'sin_ventas'
type PeriodoTop = '7d' | '30d' | '90d' | 'todo'

const DIAS_SEMANA = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
]

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
          <TabsTrigger value="compra">Pedido</TabsTrigger>
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
        <TabsContent value="compra">
          <TabCompra />
        </TabsContent>
        <TabsContent value="fiado">
          <TabFiado />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ───────────────────────── Flujo ─────────────────────────
// Tarjeta compacta de una cifra del modelo de ganancia.
function TarjetaCifra({
  etiqueta,
  monto,
  tono,
}: {
  etiqueta: string
  monto: number
  tono: 'venta' | 'costo' | 'bruta' | 'neta'
}) {
  const color =
    tono === 'venta'
      ? 'text-primary'
      : tono === 'costo'
        ? 'text-destructive'
        : monto >= 0
          ? 'text-emerald-600'
          : 'text-destructive'
  return (
    <Card className="min-w-0">
      <CardContent className="flex h-full flex-col justify-between gap-1 p-2.5">
        <p className="min-h-[2.4em] text-[11px] uppercase leading-tight text-muted-foreground">{etiqueta}</p>
        <p className={cn('whitespace-nowrap text-[13px] font-bold leading-tight tracking-tight tabular-nums', color)}>
          {formatSoles(monto)}
        </p>
      </CardContent>
    </Card>
  )
}

function MensajeFlujo({ data }: { data: FlujoResumen }) {
  const { vocab } = useNivel()
  let mensaje: ReactNode

  switch (data.diagnostico) {
    case 'margen':
      mensaje = (
        <>
          Estás vendiendo por <b>debajo de lo que te cuesta la mercadería</b>. Revisa tus precios
          de venta o negocia mejor con tus proveedores.
        </>
      )
      break
    case 'costos_fijos':
      mensaje = (
        <>
          Tu negocio <b>vende bien</b>, pero tus gastos fijos (alquiler, luz, sueldos) son altos
          para lo que vendes. Apunta a vender más o bajar esos gastos.
        </>
      )
      break
    case 'positivo':
      mensaje = (
        <>
          ¡Bien! Después de pagar la mercadería y tus gastos fijos, tu negocio <b>queda en
          ganancia</b>. Tu {vocab('flujo_caja')} está positivo.
        </>
      )
      break
    default:
      mensaje = <>Registra tus ventas y gastos para ver cómo va tu negocio.</>
  }

  const tono =
    data.diagnostico === 'positivo'
      ? 'border-primary/30 bg-primary/5'
      : data.diagnostico === 'sin_datos'
        ? 'border-muted'
        : 'border-amber-300 bg-amber-50'

  return (
    <Card className={tono}>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="text-2xl">🦙</span>
        <p className="text-sm">{mensaje}</p>
      </CardContent>
    </Card>
  )
}

function MediosPagoNegocio({ data }: { data: FlujoResumen }) {
  const [medios, setMedios] = useState<MedioPago[]>(['efectivo'])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/negocio')
      .then((r) => (r.ok ? r.json() : null))
      .then((negocio) => {
        if (negocio) setMedios(normalizarMediosPago(negocio.medios_pago))
      })
      .catch(() => undefined)
  }, [])

  function toggle(medio: MedioPago) {
    setMedios((actual) => {
      const next = actual.includes(medio)
        ? actual.filter((m) => m !== medio)
        : [...actual, medio]
      return next.length ? next : ['efectivo']
    })
  }

  async function guardar() {
    setLoading(true)
    try {
      const res = await fetch('/api/negocio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medios_pago: medios }),
      })
      if (!res.ok) throw new Error('medios')
      toast({ title: 'Medios de pago actualizados' })
    } catch {
      toast({ title: 'No se pudo guardar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const totales = data.porMedioPago ?? { efectivo: 0, yape: 0, plin: 0, tarjeta: 0 }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold text-brand-dark">Medios de pago</p>
          <p className="text-sm text-muted-foreground">Marca lo que aceptas y mira por dónde entra tu plata.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {MEDIOS_PAGO.map((m) => {
            const activo = medios.includes(m.value)
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => toggle(m.value)}
                className={cn(
                  'rounded-2xl border p-3 text-left text-sm',
                  activo ? 'border-primary bg-primary/10 text-brand-dark' : 'text-muted-foreground'
                )}
              >
                <span className="block font-semibold">{m.label}</span>
                <span className="text-xs">{formatSoles(totales[m.value] ?? 0)}</span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-brand-tint p-3 text-sm">
          {MEDIOS_PAGO.filter((m) => (totales[m.value] ?? 0) > 0).map((m) => (
            <div key={m.value} className="flex justify-between gap-2">
              <span>{etiquetaMedioPago(m.value)}</span>
              <b>{formatSoles(totales[m.value] ?? 0)}</b>
            </div>
          ))}
          {!MEDIOS_PAGO.some((m) => (totales[m.value] ?? 0) > 0) && (
            <p className="col-span-2 text-muted-foreground">Aún no hay ventas con medio de pago registrado.</p>
          )}
        </div>

        <Button className="w-full min-h-[48px]" onClick={guardar} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar medios de pago'}
        </Button>
      </CardContent>
    </Card>
  )
}

function TabFlujo() {
  const { nivel } = useNivel()
  const [data, setData] = useState<FlujoResumen | null>(null)
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
      .then((d: FlujoResumen) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje="No pudimos cargar tu flujo de caja." onReintentar={cargar} />
  if (!data) return <EstadoVacio mensaje="Aún no hay movimientos para mostrar." />

  return (
    <div className="space-y-4">
      {/* Ventas − Costo de mercadería = Ganancia bruta */}
      <div className="grid grid-cols-3 items-stretch gap-2">
        <TarjetaCifra etiqueta="Ventas" monto={data.totalVentas} tono="venta" />
        <TarjetaCifra etiqueta="Costo de mercadería" monto={data.costoMercaderia} tono="costo" />
        <TarjetaCifra etiqueta="Ganancia bruta" monto={data.gananciaBruta} tono="bruta" />
      </div>

      {/* (−) Gastos fijos = Ganancia neta */}
      <div className="grid grid-cols-2 items-stretch gap-2">
        <TarjetaCifra etiqueta="Gastos fijos" monto={data.gastosFijos} tono="costo" />
        <TarjetaCifra etiqueta="Ganancia neta" monto={data.gananciaNeta} tono="neta" />
      </div>

      <Card className="border-muted">
        <CardContent className="space-y-1 p-3 text-xs text-muted-foreground">
          <p>
            <b>Ganancia bruta</b> = lo que te dejó la venta después de pagar la mercadería
            ({formatSoles(data.costoMercaderia)}).
          </p>
          {data.tieneGastosFijos ? (
            <p>
              <b>Ganancia neta</b> = lo que te quedó al final, después de tus gastos fijos
              ({formatSoles(data.gastosFijos)}).
            </p>
          ) : (
            <p>
              Aún no registras <b>gastos fijos</b> (alquiler, luz, sueldos). Regístralos para saber
              cuánto te queda de verdad.
            </p>
          )}
        </CardContent>
      </Card>

      <GraficoFlujoAdaptativo nivel={nivel} data={data} />
      <MediosPagoNegocio data={data} />

      <MensajeFlujo data={data} />
    </div>
  )
}

// ───────────────────────── Compra Inteligente ─────────────────────────
function cantidadPedidoTexto(p: CompraInteligenteProducto): string {
  if (p.cantidad_pedir <= 0) return 'No pedir'
  if (p.unidad_compra && p.factor_compra > 1) {
    const bultos = p.cantidad_pedir / p.factor_compra
    return `${bultos} ${p.unidad_compra}${bultos === 1 ? '' : 's'} (${p.cantidad_pedir} ${p.unidad})`
  }
  return `${p.cantidad_pedir} ${p.unidad}`
}

function GrupoPedido({
  titulo,
  descripcion,
  productos,
  tono,
}: {
  titulo: string
  descripcion: string
  productos: CompraInteligenteProducto[]
  tono: 'pedir' | 'opcional' | 'no'
}) {
  const borde =
    tono === 'pedir'
      ? 'border-l-4 border-l-destructive'
      : tono === 'opcional'
        ? 'border-l-4 border-l-amber-500'
        : 'border-l-4 border-l-muted'

  return (
    <Card className={borde}>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold text-brand-dark">{titulo}</p>
          <p className="text-xs text-muted-foreground">{descripcion}</p>
        </div>
        {productos.length ? (
          <div className="space-y-2">
            {productos.slice(0, 6).map((p) => (
              <div key={p.id} className="rounded-xl border bg-background p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{p.nombre}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Stock {p.stock_actual} · vende {p.velocidad_venta}/día · {p.proveedor_nombre}
                    </p>
                  </div>
                  <span className={cn('shrink-0 text-right font-bold', tono === 'no' ? 'text-muted-foreground' : 'text-primary')}>
                    {cantidadPedidoTexto(p)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{p.motivo}</p>
                {p.costo_estimado > 0 && (
                  <p className="mt-1 text-xs font-medium text-brand-dark">
                    Costo aprox: {formatSoles(p.costo_estimado)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
            No hay productos en este grupo por ahora.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function TabCompra() {
  const [data, setData] = useState<CompraInteligenteResumen | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [nombreProveedor, setNombreProveedor] = useState('')
  const [diaVisita, setDiaVisita] = useState('1')
  const [productoId, setProductoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [unidadCompra, setUnidadCompra] = useState('')
  const [factorCompra, setFactorCompra] = useState('1')
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    setError(false)
    Promise.all([
      fetch('/api/compra-inteligente').then((r) => {
        if (!r.ok) throw new Error('fetch compra')
        return r.json()
      }),
      fetch('/api/inventario').then((r) => {
        if (!r.ok) throw new Error('fetch inventario')
        return r.json()
      }),
      fetch('/api/proveedores').then((r) => {
        if (!r.ok) throw new Error('fetch proveedores')
        return r.json()
      }),
    ])
      .then(([compra, inv, prov]: [CompraInteligenteResumen, Producto[], Proveedor[]]) => {
        setData(compra)
        setProductos(Array.isArray(inv) ? inv : [])
        setProveedores(Array.isArray(prov) ? prov : [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  async function crearProveedor() {
    if (!nombreProveedor.trim()) {
      toast({ title: 'Escribe el nombre del proveedor', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreProveedor,
          dia_visita: Number(diaVisita),
          frecuencia_dias: 7,
        }),
      })
      if (!res.ok) throw new Error('post proveedor')
      toast({ title: 'Proveedor guardado' })
      setNombreProveedor('')
      cargar()
    } catch {
      toast({ title: 'No se pudo guardar el proveedor', variant: 'destructive' })
    }
  }

  async function asignarProveedor() {
    if (!productoId || !proveedorId) {
      toast({ title: 'Elige producto y proveedor', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/inventario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productoId,
          proveedor_id: proveedorId,
          unidad_compra: unidadCompra.trim() || null,
          factor_compra: Number(factorCompra) || 1,
        }),
      })
      if (!res.ok) throw new Error('patch producto')
      toast({ title: 'Producto conectado al proveedor' })
      setProductoId('')
      setProveedorId('')
      setUnidadCompra('')
      setFactorCompra('1')
      cargar()
    } catch {
      toast({ title: 'No se pudo conectar el producto', variant: 'destructive' })
    }
  }

  async function enviarPorWhatsApp() {
    setEnviando(true)
    try {
      const res = await fetch('/api/compra-inteligente/enviar', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'No se pudo enviar')
      }
      toast({ title: 'Recomendación enviada por WhatsApp' })
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'No se pudo enviar por WhatsApp',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  if (!data && !loading && !error) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 p-4">
          <p className="font-semibold text-brand-dark">Compra Inteligente con Chaski</p>
          <p className="text-sm text-muted-foreground">
            Chaski revisa tus ventas, tu stock y el día que pasa tu proveedor para decirte qué pedir.
          </p>
          <Button className="min-h-[48px] w-full" onClick={cargar}>
            Ver recomendación para el pedido de mañana
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading) return <EstadoCargando mensaje="Chaski está revisando tu pedido..." />
  if (error) return <EstadoError mensaje="No pudimos preparar tu pedido inteligente." onReintentar={cargar} />
  if (!data) return <EstadoVacio mensaje="Aún no hay datos para recomendar compras." />

  const totalPedir = data.grupos.pedir.reduce((s, p) => s + p.costo_estimado, 0)

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="text-2xl">🦙</span>
          <div className="space-y-2 text-sm">
            <p>{data.mensajeChaski}</p>
            <p className="text-xs text-muted-foreground">
              Urgentes: {data.grupos.pedir.length} · Por si acaso: {data.grupos.opcional.length}
              {totalPedir > 0 && <> · Costo aprox: {formatSoles(totalPedir)}</>}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button className="min-h-[48px]" onClick={cargar}>
          Actualizar pedido
        </Button>
        <Button
          className="min-h-[48px]"
          variant="outline"
          disabled={enviando}
          onClick={enviarPorWhatsApp}
        >
          {enviando ? 'Enviando...' : 'Enviarme por WhatsApp'}
        </Button>
      </div>

      <GrupoPedido
        titulo="Pide sí o sí"
        descripcion="Alta rotación o se puede acabar antes de que pase el proveedor."
        productos={data.grupos.pedir}
        tono="pedir"
      />
      <GrupoPedido
        titulo="Por si acaso"
        descripcion="Aguanta justo, pero conviene un colchón pequeño."
        productos={data.grupos.opcional}
        tono="opcional"
      />
      <GrupoPedido
        titulo="Mejor no pidas"
        descripcion="Tienes suficiente o se mueve poco. Cuida tu plata."
        productos={data.grupos.noPedir}
        tono="no"
      />

      {!!data.consejos.length && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="font-semibold text-brand-dark">Consejos de Chaski</p>
            {data.consejos.slice(0, 2).map((c) => (
              <p key={c} className="rounded-xl bg-brand-tint p-3 text-sm text-brand-dark">
                {c}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-semibold text-brand-dark">Proveedores y visita</p>
            <p className="text-xs text-muted-foreground">
              Registra cuándo pasa cada proveedor para que Chaski calcule mejor el pedido.
            </p>
          </div>
          <Input
            value={nombreProveedor}
            onChange={(e) => setNombreProveedor(e.target.value)}
            placeholder="Nombre del proveedor"
          />
          <Select value={diaVisita} onValueChange={setDiaVisita}>
            <SelectTrigger>
              <SelectValue placeholder="Día de visita" />
            </SelectTrigger>
            <SelectContent>
              {DIAS_SEMANA.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="min-h-[48px] w-full" onClick={crearProveedor}>
            Guardar proveedor
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-semibold text-brand-dark">Conectar producto con proveedor</p>
            <p className="text-xs text-muted-foreground">
              Así Chaski sabe qué recomendarle a cada proveedor.
            </p>
          </div>
          <Select value={productoId} onValueChange={setProductoId}>
            <SelectTrigger>
              <SelectValue placeholder="Producto" />
            </SelectTrigger>
            <SelectContent>
              {productos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={proveedorId} onValueChange={setProveedorId}>
            <SelectTrigger>
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              {proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={unidadCompra}
              onChange={(e) => setUnidadCompra(e.target.value)}
              placeholder="Caja/saco"
            />
            <Input
              value={factorCompra}
              onChange={(e) => setFactorCompra(e.target.value)}
              inputMode="numeric"
              placeholder="Unid."
            />
          </div>
          <Button className="min-h-[48px] w-full" onClick={asignarProveedor}>
            Guardar relación
          </Button>
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

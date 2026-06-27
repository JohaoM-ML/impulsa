'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Mic, Pencil, Plus, Trash2, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CamaraGuia } from '@/components/registrar/CamaraGuia'
import { ConfirmacionOCR } from '@/components/registrar/ConfirmacionOCR'
import { GrabadoraVoz } from '@/components/registrar/GrabadoraVoz'
import { SugerirAgregarInventario } from '@/components/registrar/SugerirAgregarInventario'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { PageHeader } from '@/components/shared/PageHeader'
import { toast } from '@/hooks/use-toast'
import { matchProductoInventario, productosSinInventario } from '@/lib/inventario-match'
import { etiquetaMedioPago, MEDIOS_PAGO, normalizarMediosPago } from '@/lib/medios-pago'
import { formatSoles } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ComprobantePagoDetectado, MedioPago, OCRProductoDetectado, Producto } from '@/types'

type Tipo = 'venta' | 'compra'

interface LineaManual extends OCRProductoDetectado {
  producto_id?: string | null
}

interface ComprobanteVenta extends ComprobantePagoDetectado {
  comprobante_url: string
}

export default function RegistrarPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<Tipo>('venta')
  const [inventario, setInventario] = useState<Producto[]>([])
  const [mediosAceptados, setMediosAceptados] = useState<MedioPago[]>(['efectivo'])
  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo')
  const [detectados, setDetectados] = useState<OCRProductoDetectado[] | null>(null)
  const [textoRaw, setTextoRaw] = useState('')
  const [comprobanteVenta, setComprobanteVenta] = useState<ComprobanteVenta | null>(null)
  const [comprobanteProductoId, setComprobanteProductoId] = useState('')
  const [comprobanteNombre, setComprobanteNombre] = useState('')
  const [comprobanteCantidad, setComprobanteCantidad] = useState('1')
  const [procesando, setProcesando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [pendientesInventario, setPendientesInventario] = useState<{
    items: OCRProductoDetectado[]
    nuevos: OCRProductoDetectado[]
  } | null>(null)

  // Estado del carrito manual
  const [carrito, setCarrito] = useState<LineaManual[]>([])
  const [selProductoId, setSelProductoId] = useState<string>('')
  const [nombreLibre, setNombreLibre] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [precio, setPrecio] = useState('')

  const cargarInventario = useCallback(async () => {
    try {
      const [inventarioRes, negocioRes] = await Promise.all([
        fetch('/api/inventario'),
        fetch('/api/negocio'),
      ])
      if (inventarioRes.ok) setInventario(await inventarioRes.json())
      if (negocioRes.ok) {
        const negocio = await negocioRes.json()
        const medios = normalizarMediosPago(negocio.medios_pago)
        setMediosAceptados(medios)
        setMedioPago((actual) => (medios.includes(actual) ? actual : medios[0]))
      }
    } catch {
      /* inventario opcional */
    }
  }, [])

  useEffect(() => {
    cargarInventario()
  }, [cargarInventario])

  // ── Procesar foto ──
  async function procesarFoto(base64: string) {
    setProcesando(true)
    setComprobanteVenta(null)
    try {
      const res = await fetch('/api/ia/extraer-foto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen: base64, tipo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo leer la foto')
      if (!data.productos?.length) {
        toast({ title: 'No detecté productos', description: 'Prueba con otra foto o usa Manual', variant: 'destructive' })
        return
      }
      setTextoRaw(data.texto ?? '')
      setDetectados(data.productos)
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally {
      setProcesando(false)
    }
  }

  async function procesarComprobante(base64: string) {
    setProcesando(true)
    setDetectados(null)
    try {
      const res = await fetch('/api/ia/leer-comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen: base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo leer el comprobante')
      if (!data.monto || !data.medio_pago || !data.comprobante_url) {
        toast({
          title: 'No pude leer el comprobante',
          description: 'Prueba otra captura o registra la venta manual.',
          variant: 'destructive',
        })
        return
      }
      const comprobante = data as ComprobanteVenta
      setComprobanteVenta(comprobante)
      setMedioPago(comprobante.medio_pago ?? 'efectivo')
      toast({
        title: `${etiquetaMedioPago(comprobante.medio_pago)} detectado`,
        description: formatSoles(comprobante.monto ?? 0),
      })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally {
      setProcesando(false)
    }
  }

  // ── Procesar voz ──
  async function procesarVoz(blob: Blob) {
    setProcesando(true)
    setComprobanteVenta(null)
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'audio.webm')
      const tr = await fetch('/api/ia/transcribir', { method: 'POST', body: fd })
      const trData = await tr.json()
      if (!tr.ok) throw new Error(trData.error || 'No se pudo transcribir')

      const es = await fetch('/api/ia/estructurar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: trData.texto, tipo }),
      })
      const esData = await es.json()
      if (!es.ok) throw new Error(esData.error || 'No se pudo interpretar')
      if (!esData.productos?.length) {
        toast({ title: 'No entendí los productos', description: trData.texto || 'Intenta de nuevo', variant: 'destructive' })
        return
      }
      setTextoRaw(trData.texto ?? '')
      setDetectados(esData.productos)
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally {
      setProcesando(false)
    }
  }

  // ── Guardar (venta o compra) ──
  async function ejecutarGuardar(
    items: OCRProductoDetectado[],
    inventarioActual: Producto[] = inventario
  ) {
    setGuardando(true)
    try {
      if (tipo === 'venta') {
        const itemsVenta = items.map((it) => {
          const prod = matchProductoInventario(it.nombre, inventarioActual)
          const precioFinal =
            it.precio_unit != null && !Number.isNaN(it.precio_unit)
              ? it.precio_unit
              : Number(prod?.precio_venta ?? 0) || 0
          return {
            nombre_item: it.nombre,
            cantidad: it.cantidad,
            precio_unit: precioFinal,
            producto_id: prod?.id ?? null,
          }
        })
        const res = await fetch('/api/ventas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: itemsVenta,
            medio_pago: comprobanteVenta?.medio_pago ?? medioPago,
            comprobante_url: comprobanteVenta?.comprobante_url ?? null,
            total: comprobanteVenta?.monto ?? undefined,
          }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'No se pudo registrar la venta')
        }
        const total = itemsVenta.reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
        toast({ title: 'Venta registrada', description: formatSoles(total) })
      } else {
        const res = await fetch('/api/inventario/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productos: items, texto_raw: textoRaw || undefined }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'No se pudo registrar la compra')
        }
        toast({ title: 'Inventario actualizado', description: `${items.length} producto(s)` })
      }

      setDetectados(null)
      setComprobanteVenta(null)
      setComprobanteProductoId('')
      setComprobanteNombre('')
      setComprobanteCantidad('1')
      setCarrito([])
      setTextoRaw('')
      setPendientesInventario(null)
      await cargarInventario()
      router.push('/inicio')
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally {
      setGuardando(false)
    }
  }

  async function guardar(items: OCRProductoDetectado[]) {
    if (tipo === 'venta') {
      const nuevos = productosSinInventario(items, inventario)
      if (nuevos.length > 0) {
        const detalleNuevos = items.filter((it) =>
          nuevos.some((n) => n.nombre.trim().toLowerCase() === it.nombre.trim().toLowerCase())
        )
        setPendientesInventario({ items, nuevos: detalleNuevos })
        return
      }
    }
    await ejecutarGuardar(items)
  }

  async function agregarAlInventarioYGuardar(seleccionados: OCRProductoDetectado[]) {
    setGuardando(true)
    try {
      const inventarioActualizado = [...inventario]
      for (const it of seleccionados) {
        const precioVenta = it.precio_unit ?? 0
        const res = await fetch('/api/inventario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: it.nombre,
            precio_venta: precioVenta,
            precio_compra: precioVenta > 0 ? Math.round(precioVenta * 0.65 * 100) / 100 : null,
            stock_actual: Math.max(it.cantidad, 10),
            stock_minimo: 5,
          }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || `No se pudo agregar ${it.nombre}`)
        }
        inventarioActualizado.push(await res.json())
      }
      setInventario(inventarioActualizado)
      if (pendientesInventario) {
        await ejecutarGuardar(pendientesInventario.items, inventarioActualizado)
      }
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
      setGuardando(false)
    }
  }

  // ── Manual: agregar al carrito ──
  function onSelectProducto(id: string) {
    setSelProductoId(id)
    if (id === 'otro') {
      setPrecio('')
      return
    }
    const prod = inventario.find((p) => p.id === id)
    if (prod) {
      const sugerido = tipo === 'venta' ? prod.precio_venta : prod.precio_compra
      setPrecio(sugerido ? String(sugerido) : '')
    }
  }

  function agregarLinea() {
    setComprobanteVenta(null)
    const prod = inventario.find((p) => p.id === selProductoId)
    const nombre = selProductoId === 'otro' || !prod ? nombreLibre.trim() : prod.nombre
    const cant = parseFloat(cantidad) || 0
    const prc = parseFloat(precio) || 0
    if (!nombre || cant <= 0) {
      toast({ title: 'Faltan datos', description: 'Elige producto y cantidad', variant: 'destructive' })
      return
    }
    setCarrito((prev) => [
      ...prev,
      { nombre, cantidad: cant, precio_unit: prc, producto_id: prod?.id ?? null },
    ])
    setSelProductoId('')
    setNombreLibre('')
    setCantidad('1')
    setPrecio('')
  }

  function confirmarComprobanteProducto() {
    if (!comprobanteVenta?.monto || comprobanteVenta.monto <= 0) return
    const prod = inventario.find((p) => p.id === comprobanteProductoId)
    const nombre =
      comprobanteProductoId === 'otro' || !prod ? comprobanteNombre.trim() : prod.nombre
    const cant = parseFloat(comprobanteCantidad) || 0
    if (!nombre || cant <= 0) {
      toast({ title: 'Faltan datos', description: 'Agrega producto y cantidad', variant: 'destructive' })
      return
    }
    setDetectados([
      {
        nombre,
        cantidad: cant,
        precio_unit: Math.round((comprobanteVenta.monto / cant) * 100) / 100,
      },
    ])
  }

  const totalCarrito = carrito.reduce((s, l) => s + l.cantidad * (l.precio_unit ?? 0), 0)

  if (procesando) return <EstadoCargando mensaje="Leyendo con IA..." />

  if (pendientesInventario) {
    return (
      <SugerirAgregarInventario
        productos={pendientesInventario.nuevos}
        loading={guardando}
        onAgregarYContinuar={agregarAlInventarioYGuardar}
        onSoloContinuar={() => ejecutarGuardar(pendientesInventario.items)}
        onCancelar={() => setPendientesInventario(null)}
      />
    )
  }

  // Confirmación de lo detectado por foto/voz
  if (detectados) {
    return (
      <ConfirmacionOCR
        productos={detectados}
        inventario={inventario}
        loading={guardando}
        titulo={tipo === 'venta' ? 'Revisa la venta' : 'Revisa la compra'}
        labelConfirmar={tipo === 'venta' ? 'Registrar venta' : 'Registrar compra'}
        labelCancelar="Volver"
        onConfirmar={guardar}
        onCancelar={() => setDetectados(null)}
      />
    )
  }

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        eyebrow="Operar"
        title="Registra tu movimiento"
        description="Foto, voz o manual. Tú eliges; Impulsa ordena los datos."
      />

      {/* Toggle Venta / Compra */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-brand-tint p-1 ring-1 ring-primary/10">
        {(['venta', 'compra'] as Tipo[]).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={cn(
              'min-h-[48px] rounded-xl px-3 py-2 text-sm font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tipo === t
                ? 'bg-background text-brand-dark shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-brand-dark'
            )}
          >
            {t === 'venta' ? 'Venta' : 'Compra / Reposición'}
          </button>
        ))}
      </div>

      {inventario.length === 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-900">
              Tu inventario está vacío. Registra una compra o agrega productos para que las ventas crucen con stock real.
            </p>
          </CardContent>
        </Card>
      )}

      {tipo === 'venta' && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <Label>Medio de pago</Label>
            <Select value={medioPago} onValueChange={(v) => setMedioPago(v as MedioPago)}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIOS_PAGO.filter((m) => mediosAceptados.includes(m.value)).map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="foto">
        <TabsList>
          <TabsTrigger value="foto">
            <Camera className="h-4 w-4" /> Foto
          </TabsTrigger>
          {tipo === 'venta' && (
            <TabsTrigger value="comprobante">
              <WalletCards className="h-4 w-4" /> Yape/Plin
            </TabsTrigger>
          )}
          <TabsTrigger value="voz">
            <Mic className="h-4 w-4" /> Voz
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Pencil className="h-4 w-4" /> Manual
          </TabsTrigger>
        </TabsList>

        {/* FOTO */}
        <TabsContent value="foto" className="space-y-3">
          <ChaskiHint texto="Saca foto a la boleta o lista y yo extraigo los productos. ¡Listo!" />
          <CamaraGuia onCaptura={procesarFoto} />
        </TabsContent>

        {tipo === 'venta' && (
          <TabsContent value="comprobante" className="space-y-3">
            <ChaskiHint texto="Sube la captura de Yape o Plin. Yo leo el monto; tú solo completas producto y cantidad." />
            {!comprobanteVenta ? (
              <CamaraGuia onCaptura={procesarComprobante} />
            ) : (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="rounded-2xl bg-brand-tint p-3">
                    <p className="text-sm font-semibold text-brand-dark">
                      {etiquetaMedioPago(comprobanteVenta.medio_pago)} detectado
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {formatSoles(comprobanteVenta.monto ?? 0)}
                    </p>
                    {comprobanteVenta.operacion && (
                      <p className="text-xs text-muted-foreground">
                        Operación: {comprobanteVenta.operacion}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Producto vendido</Label>
                    <Select value={comprobanteProductoId} onValueChange={setComprobanteProductoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elige un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventario.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                        <SelectItem value="otro">Otro (escribir)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {comprobanteProductoId === 'otro' && (
                    <div className="space-y-2">
                      <Label htmlFor="comprobanteNombre">Nombre del producto</Label>
                      <Input
                        id="comprobanteNombre"
                        value={comprobanteNombre}
                        onChange={(e) => setComprobanteNombre(e.target.value)}
                        placeholder="Ej. Gaseosa 500ml"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="comprobanteCantidad">Cantidad</Label>
                    <Input
                      id="comprobanteCantidad"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={comprobanteCantidad}
                      onChange={(e) => setComprobanteCantidad(e.target.value)}
                    />
                  </div>

                  <Button className="w-full min-h-[48px]" onClick={confirmarComprobanteProducto}>
                    Revisar venta
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full min-h-[48px]"
                    onClick={() => setComprobanteVenta(null)}
                  >
                    Cambiar comprobante
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* VOZ */}
        <TabsContent value="voz" className="space-y-3">
          <ChaskiHint texto={`Dime qué ${tipo === 'venta' ? 'vendiste' : 'compraste'} y yo lo anoto.`} />
          <GrabadoraVoz onAudio={procesarVoz} disabled={procesando} />
        </TabsContent>

        {/* MANUAL */}
        <TabsContent value="manual" className="space-y-3">
          <ChaskiHint texto="Elige del inventario o escribe el producto." />
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select value={selProductoId} onValueChange={onSelectProducto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventario.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                    <SelectItem value="otro">Otro (escribir)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selProductoId === 'otro' && (
                <div className="space-y-2">
                  <Label htmlFor="nombreLibre">Nombre del producto</Label>
                  <Input
                    id="nombreLibre"
                    value={nombreLibre}
                    onChange={(e) => setNombreLibre(e.target.value)}
                    placeholder="Ej. Galletas surtidas"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio (S/)</Label>
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                  />
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={agregarLinea}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </CardContent>
          </Card>

          {carrito.length > 0 && (
            <Card>
              <CardContent className="space-y-2 p-4">
                {carrito.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>
                      {l.nombre} × {l.cantidad}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatSoles(l.cantidad * (l.precio_unit ?? 0))}</span>
                      <button
                        aria-label="Quitar producto"
                        onClick={() => setCarrito((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatSoles(totalCarrito)}</span>
                </div>
                <Button
                  className="w-full min-h-[48px]"
                  disabled={guardando}
                  onClick={() => guardar(carrito)}
                >
                  {guardando
                    ? 'Guardando...'
                    : tipo === 'venta'
                      ? 'Registrar venta'
                      : 'Registrar compra'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ChaskiHint({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-brand-tint/70 p-3">
      <span className="text-2xl">🦙</span>
      <p className="text-sm text-brand-dark">{texto}</p>
    </div>
  )
}

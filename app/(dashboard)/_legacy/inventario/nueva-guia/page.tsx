'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CamaraGuia } from '@/components/registrar/CamaraGuia'
import { ConfirmacionOCR } from '@/components/registrar/ConfirmacionOCR'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { toast } from '@/hooks/use-toast'
import type { OCRProductoDetectado } from '@/types'

/** @deprecated Usar /registrar (tab Foto) — conservado solo como referencia */
export default function NuevaGuiaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [productos, setProductos] = useState<OCRProductoDetectado[] | null>(null)
  const [textoRaw, setTextoRaw] = useState('')

  async function procesarImagen(base64: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen: base64 }),
      })
      if (!res.ok) throw new Error('Error al procesar imagen')
      const data = await res.json()
      setProductos(data.productos)
      setTextoRaw(data.texto)
    } catch {
      toast({ title: 'Error', description: 'No se pudo leer la guía', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function confirmar(items: OCRProductoDetectado[]) {
    setLoading(true)
    const res = await fetch('/api/inventario/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productos: items, texto_raw: textoRaw }),
    })
    setLoading(false)

    if (!res.ok) {
      toast({ title: 'Error', description: 'No se pudo guardar inventario', variant: 'destructive' })
      return
    }

    toast({ title: 'Inventario actualizado', description: `${items.length} productos agregados` })
    router.push('/mi-negocio')
  }

  if (loading && !productos) return <EstadoCargando mensaje="Leyendo guía..." />

  if (productos) {
    return (
      <ConfirmacionOCR
        productos={productos}
        onConfirmar={confirmar}
        onCancelar={() => setProductos(null)}
        loading={loading}
      />
    )
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Foto de guía</h1>
      <CamaraGuia onCaptura={procesarImagen} />
    </div>
  )
}

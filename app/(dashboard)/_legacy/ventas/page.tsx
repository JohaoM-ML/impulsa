'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EstadoCargando } from '@/components/estados/EstadoCargando'
import { EstadoError } from '@/components/estados/EstadoError'
import { EstadoVacio } from '@/components/estados/EstadoVacio'
import { useNivel } from '@/hooks/useNivel'
import { useVentas } from '@/hooks/useVentas'
import { formatSoles } from '@/lib/utils'

/** @deprecated Usar /registrar — conservado solo como referencia */
export default function VentasPage() {
  const { vocab } = useNivel()
  const { ventas, loading, error, recargar } = useVentas()

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={recargar} />
  if (!ventas.length) {
    return (
      <div className="p-4">
        <EstadoVacio
          mensaje="Aún no tienes ventas registradas"
          accionHref="/registrar"
          accionLabel="Registrar primera venta"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{vocab('ventas_hoy')}</h1>
        <Button asChild size="sm" className="min-h-[48px]">
          <Link href="/registrar">+ Nueva</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {ventas.map((venta) => (
          <Card key={venta.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{formatSoles(Number(venta.total))}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{new Date(venta.creado_en).toLocaleString('es-PE')}</p>
              <ul className="mt-2 space-y-1">
                {venta.items_venta?.map((item, i) => (
                  <li key={i}>
                    {item.nombre_item} × {item.cantidad}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatSoles } from '@/lib/utils'

export function TarjetaResumen({
  titulo,
  valor,
  subtitulo,
  destacado,
}: {
  titulo: string
  valor: string
  subtitulo?: string
  destacado?: boolean
}) {
  return (
    <Card className={destacado ? 'border-primary/30 bg-brand-tint/70' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-brand-dark">{valor}</p>
        {subtitulo && <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>}
      </CardContent>
    </Card>
  )
}

export function TarjetaResumenSoles({
  titulo,
  monto,
  subtitulo,
  destacado,
}: {
  titulo: string
  monto: number
  subtitulo?: string
  destacado?: boolean
}) {
  return (
    <TarjetaResumen
      titulo={titulo}
      valor={formatSoles(monto)}
      subtitulo={subtitulo}
      destacado={destacado}
    />
  )
}

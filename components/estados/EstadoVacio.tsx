import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function EstadoVacio({
  mensaje,
  accionHref,
  accionLabel,
}: {
  mensaje: string
  accionHref?: string
  accionLabel?: string
}) {
  return (
    <div className="p-4">
      <Card className="border-dashed bg-brand-tint/45">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        +
      </div>
      <p className="text-sm text-muted-foreground">{mensaje}</p>
      {accionHref && accionLabel && (
        <Button asChild>
          <Link href={accionHref}>{accionLabel}</Link>
        </Button>
      )}
        </CardContent>
      </Card>
    </div>
  )
}

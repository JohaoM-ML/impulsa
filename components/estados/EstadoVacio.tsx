import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-muted-foreground">{mensaje}</p>
      {accionHref && accionLabel && (
        <Button asChild className="min-h-[48px]">
          <Link href={accionHref}>{accionLabel}</Link>
        </Button>
      )}
    </div>
  )
}

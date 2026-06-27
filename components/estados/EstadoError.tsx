import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function EstadoError({
  mensaje,
  onReintentar,
}: {
  mensaje: string
  onReintentar?: () => void
}) {
  return (
    <div className="p-4">
      <Card className="border-destructive/25 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-lg">
        !
      </div>
      <div>
        <p className="font-semibold text-destructive">Algo no cargó bien</p>
        <p className="mt-1 text-sm text-muted-foreground">{mensaje}</p>
      </div>
      {onReintentar && (
        <Button variant="outline" onClick={onReintentar}>
          Reintentar
        </Button>
      )}
        </CardContent>
      </Card>
    </div>
  )
}

import { Button } from '@/components/ui/button'

export function EstadoError({
  mensaje,
  onReintentar,
}: {
  mensaje: string
  onReintentar?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-destructive">{mensaje}</p>
      {onReintentar && (
        <Button variant="outline" onClick={onReintentar} className="min-h-[48px]">
          Reintentar
        </Button>
      )}
    </div>
  )
}

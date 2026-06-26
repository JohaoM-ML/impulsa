import { Skeleton } from '@/components/ui/skeleton'

export function EstadoCargando({ mensaje = 'Cargando...' }: { mensaje?: string }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-muted-foreground">{mensaje}</p>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

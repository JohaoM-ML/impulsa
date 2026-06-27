import { Skeleton } from '@/components/ui/skeleton'

export function EstadoCargando({ mensaje = 'Cargando...' }: { mensaje?: string }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-3xl bg-brand-dark p-5 text-white">
        <p className="text-sm font-semibold">{mensaje}</p>
        <p className="mt-1 text-xs text-white/70">Estamos preparando tus datos.</p>
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}

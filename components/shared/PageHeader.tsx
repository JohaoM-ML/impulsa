import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string
  description?: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <header className="rounded-3xl bg-brand-dark px-4 py-5 text-white shadow-lg shadow-brand-dark/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-light">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          {description && <p className="mt-1 text-sm leading-relaxed text-white/80">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}

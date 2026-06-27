'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, GraduationCap, Home, Store, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/registrar', label: 'Registrar', icon: ClipboardList },
  { href: '/mi-negocio', label: 'Mi Negocio', icon: Store },
  { href: '/salud', label: 'Salud', icon: Trophy },
  { href: '/aprender', label: 'Aprender', icon: GraduationCap },
]

export function NavInferior({ nivel = 1 }: { nivel?: number }) {
  void nivel
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
      <div className="mx-auto flex max-w-[390px] justify-around rounded-3xl border border-border/70 bg-background/95 p-1 shadow-xl shadow-brand-dark/15 backdrop-blur-xl">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              data-tour={href.replace('/', '')}
              className={cn(
                'flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-brand-tint text-brand-dark'
                  : 'text-muted-foreground hover:bg-brand-tint/60 hover:text-brand-dark'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

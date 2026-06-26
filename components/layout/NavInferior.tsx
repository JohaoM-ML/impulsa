'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, GraduationCap, Home, Store, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/registrar', label: 'Registrar', icon: ClipboardList },
  { href: '/mi-negocio', label: 'Mi Negocio', icon: Store },
  { href: '/pym-score', label: 'PymScore', icon: Trophy },
  { href: '/aprender', label: 'Aprender', icon: GraduationCap },
]

export function NavInferior({ nivel = 1 }: { nivel?: number }) {
  void nivel
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="mx-auto flex max-w-[390px] justify-around">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px]',
                active ? 'text-primary font-medium' : 'text-muted-foreground'
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

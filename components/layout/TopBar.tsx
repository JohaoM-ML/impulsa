'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { NOMBRES_NIVEL, type Nivel } from '@/lib/vocabulario'
import { createBrowserClient } from '@/lib/supabase/client'

const SUBTITULOS: Record<string, string> = {
  '/inicio': '',
  '/registrar': 'Registrar',
  '/mi-negocio': 'Mi Negocio',
  '/salud': 'Salud Financiera',
  '/aprender': 'Aprender',
}

function subtituloDe(pathname: string): string {
  const clave = Object.keys(SUBTITULOS).find((k) => pathname.startsWith(k))
  return clave ? SUBTITULOS[clave] : ''
}

export function TopBar({ nivel = 1 }: { nivel?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const subtitulo = subtituloDe(pathname)

  async function cerrarSesion() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand-dark shadow-sm shadow-brand-dark/20">
          <Image
            src="/logo-impulsa.png"
            alt="Impulsa"
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
            priority
          />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-brand-dark">Impulsa</p>
          {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-dark ring-1 ring-primary/20">
          Nivel: {NOMBRES_NIVEL[(nivel as Nivel) ?? 1]}
        </span>
        <button
          type="button"
          onClick={cerrarSesion}
          aria-label="Cerrar sesión"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-brand-tint hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

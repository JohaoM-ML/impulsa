'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Info, LogOut } from 'lucide-react'
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
    <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f3d56] text-white">
          <Info className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-[#0f3d56]">Impulsa</p>
          {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[#6d28d9] px-3 py-1 text-xs font-semibold text-white">
          Nivel: {NOMBRES_NIVEL[(nivel as Nivel) ?? 1]}
        </span>
        <button
          type="button"
          onClick={cerrarSesion}
          aria-label="Cerrar sesión"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

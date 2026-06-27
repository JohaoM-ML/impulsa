'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'impulsa_tutorial_visto'

interface PasoTutorial {
  target?: string
  titulo: string
  texto: string
}

const PASOS: PasoTutorial[] = [
  {
    titulo: '¡Bienvenido a Impulsa! 🦙',
    texto: 'Te muestro en unos segundos cómo sacarle provecho a tu negocio.',
  },
  {
    target: 'registrar',
    titulo: 'Registra todo',
    texto: 'Anota ventas, compras y gastos por foto, voz o a mano.',
  },
  {
    target: 'mi-negocio',
    titulo: 'Mi Negocio',
    texto: 'Revisa tu inventario, tu flujo de dinero y a quién le fías.',
  },
  {
    target: 'salud',
    titulo: 'Salud Financiera',
    texto: 'Mira cómo va tu negocio con un puntaje claro y consejos para mejorar.',
  },
  {
    target: 'aprender',
    titulo: 'Aprende y sube de nivel',
    texto: 'Completa módulos cortos para desbloquear más funciones.',
  },
  {
    titulo: 'Tu asesor en WhatsApp 💬',
    texto:
      'Escríbele a tu asesor por WhatsApp para registrar y consultar todo, sin abrir la app.',
  },
]

interface Recorte {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialGuiado() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [montado, setMontado] = useState(false)
  const [activo, setActivo] = useState(false)
  const [paso, setPaso] = useState(0)
  const [recorte, setRecorte] = useState<Recorte | null>(null)

  useEffect(() => {
    setMontado(true)
  }, [])

  // Arranca con ?tour=1 (post-onboarding) o la primera vez que entra a /inicio.
  useEffect(() => {
    if (!montado || pathname !== '/inicio') return
    const yaVisto = window.localStorage.getItem(STORAGE_KEY) === '1'
    const forzar = searchParams.get('tour') === '1'
    if (forzar || !yaVisto) {
      setPaso(0)
      setActivo(true)
    }
    if (forzar) {
      router.replace('/inicio')
    }
  }, [montado, pathname, searchParams, router])

  const pasoActual = PASOS[paso]

  const recalcular = useCallback(() => {
    if (!pasoActual?.target) {
      setRecorte(null)
      return
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${pasoActual.target}"]`)
    if (!el) {
      setRecorte(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRecorte({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [pasoActual])

  useEffect(() => {
    if (!activo) return
    recalcular()
    window.addEventListener('resize', recalcular)
    window.addEventListener('scroll', recalcular, true)
    return () => {
      window.removeEventListener('resize', recalcular)
      window.removeEventListener('scroll', recalcular, true)
    }
  }, [activo, recalcular])

  function cerrar() {
    window.localStorage.setItem(STORAGE_KEY, '1')
    setActivo(false)
  }

  function siguiente() {
    if (paso < PASOS.length - 1) {
      setPaso((p) => p + 1)
    } else {
      cerrar()
    }
  }

  if (!montado || !activo || !pasoActual) return null

  const margen = 8
  const radio = 12
  const hayRecorte = recorte !== null

  // La burbuja va arriba del elemento si está en la mitad inferior (nav abajo).
  const burbujaAbajo = hayRecorte ? recorte!.top < window.innerHeight / 2 : false

  const overlay = (
    <div className="fixed inset-0 z-[100]">
      {/* Spotlight: capa oscura con un hueco sobre el elemento objetivo */}
      {hayRecorte ? (
        <div
          className="absolute rounded-xl transition-all duration-300"
          style={{
            top: recorte!.top - margen,
            left: recorte!.left - margen,
            width: recorte!.width + margen * 2,
            height: recorte!.height + margen * 2,
            borderRadius: radio,
            boxShadow: '0 0 0 9999px rgba(15, 61, 86, 0.72)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#0f3d56]/75" />
      )}

      {/* Burbuja */}
      <div
        className="absolute left-1/2 w-[300px] max-w-[88vw] -translate-x-1/2 rounded-2xl bg-white p-4 shadow-xl"
        style={
          hayRecorte
            ? burbujaAbajo
              ? { top: recorte!.top + recorte!.height + margen + 12 }
              : { top: Math.max(16, recorte!.top - margen - 12 - 180) }
            : { top: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <p className="text-base font-bold text-[#0f3d56]">{pasoActual.titulo}</p>
        <p className="mt-1 text-sm text-muted-foreground">{pasoActual.texto}</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {PASOS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === paso ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cerrar}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              Omitir
            </button>
            <Button size="sm" className="h-9" onClick={siguiente}>
              {paso < PASOS.length - 1 ? 'Siguiente' : 'Entendido'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}

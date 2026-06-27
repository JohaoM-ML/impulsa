'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TextoFormateado } from '@/components/shared/TextoFormateado'
import { cn } from '@/lib/utils'

/**
 * Muestra un resumen corto (primera frase) y permite desglosar el texto completo.
 * Pensado para la explicación de salud financiera, que suele ser larga.
 */
export function ExplicacionColapsable({
  texto,
  className,
  classNameBoton,
}: {
  texto: string
  className?: string
  classNameBoton?: string
}) {
  const [abierto, setAbierto] = useState(false)

  const limpio = texto.replace(/\s+/g, ' ').trim()
  const primeraFrase = limpio.match(/^.*?[.!?](\s|$)/)?.[0]?.trim() ?? limpio
  const hayMas = primeraFrase.length < limpio.length

  return (
    <div className={className}>
      {abierto ? (
        <TextoFormateado texto={texto} />
      ) : (
        <TextoFormateado texto={primeraFrase} />
      )}

      {hayMas && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline',
            classNameBoton
          )}
        >
          {abierto ? (
            <>
              Ver menos <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Ver detalle <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

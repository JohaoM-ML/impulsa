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

  const lineas = texto.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  const idxPrimerBullet = lineas.findIndex((l) => /^[-*]\s+/.test(l))

  // Si la IA devolvió viñetas, el resumen es la(s) línea(s) antes de la primera viñeta.
  // Si es un párrafo plano, el resumen es la primera frase.
  let resumen: string
  if (idxPrimerBullet > 0) {
    resumen = lineas.slice(0, idxPrimerBullet).join('\n')
  } else if (idxPrimerBullet === 0) {
    resumen = lineas[0]
  } else {
    const limpio = texto.replace(/\s+/g, ' ').trim()
    resumen = limpio.match(/^.*?[.!?](\s|$)/)?.[0]?.trim() ?? limpio
  }

  const hayMas = resumen.replace(/\s+/g, ' ').trim().length < texto.replace(/\s+/g, ' ').trim().length

  return (
    <div className={className}>
      {abierto ? (
        <TextoFormateado texto={texto} />
      ) : (
        <TextoFormateado texto={resumen} />
      )}

      {hayMas && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-sm font-semibold underline-offset-2 hover:underline',
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

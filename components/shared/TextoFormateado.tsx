import { Fragment } from 'react'

/**
 * Renderiza markdown simple (negritas, títulos #, viñetas) que devuelve la IA,
 * sin librerías externas. Pensado para textos cortos tipo explicación de score.
 */
export function TextoFormateado({ texto, className }: { texto: string; className?: string }) {
  const lineas = texto
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <div className={className}>
      {lineas.map((linea, i) => {
        const titulo = linea.match(/^#{1,6}\s+(.*)$/)
        if (titulo) {
          return (
            <p key={i} className="mb-1 text-base font-bold leading-snug">
              {renderInline(titulo[1])}
            </p>
          )
        }

        const vineta = linea.match(/^[-*]\s+(.*)$/)
        if (vineta) {
          return (
            <p key={i} className="flex gap-2 leading-relaxed [&:not(:first-child)]:mt-2">
              <span aria-hidden className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
              <span>{renderInline(vineta[1])}</span>
            </p>
          )
        }

        return (
          <p key={i} className="leading-relaxed [&:not(:first-child)]:mt-2">
            {renderInline(linea)}
          </p>
        )
      })}
    </div>
  )
}

/** Convierte **negritas** en <strong>, dejando el resto como texto. */
function renderInline(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return partes.map((parte, i) => {
    const bold = parte.match(/^\*\*([^*]+)\*\*$/)
    if (bold) {
      return <strong key={i} className="font-semibold">{bold[1]}</strong>
    }
    return <Fragment key={i}>{parte}</Fragment>
  })
}

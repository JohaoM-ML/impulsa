import type { CompraInteligenteProducto, CompraInteligenteResumen } from '@/types'

const LIMITE_MENSAJE_WSP = 1500

function soles(monto: number): string {
  return `S/ ${monto.toFixed(2)}`
}

function lineaPedir(producto: CompraInteligenteProducto): string {
  const costo = producto.costo_estimado > 0 ? ` aprox. ${soles(producto.costo_estimado)}` : ''
  return `- ${producto.nombre}: ${producto.cantidad_pedir} ${producto.unidad}${costo}`
}

function lineaEvitar(producto: CompraInteligenteProducto): string {
  return `- ${producto.nombre}: ${producto.motivo}`
}

function bloque(titulo: string, lineas: string[]): string[] {
  if (!lineas.length) return []
  return ['', titulo, ...lineas]
}

export function formatearPedidoWhatsApp(resumen: CompraInteligenteResumen): string {
  const pedir = resumen.grupos.pedir.slice(0, 5).map(lineaPedir)
  const opcional = resumen.grupos.opcional.slice(0, 4).map(lineaPedir)
  const noPedir = resumen.grupos.noPedir.slice(0, 4).map(lineaEvitar)
  const consejo = resumen.consejos[0]?.trim()

  const lineas = [
    resumen.mensajeChaski,
    ...bloque('Pide sí o sí:', pedir),
    ...bloque('Por si acaso:', opcional),
    ...bloque('Mejor no pidas:', noPedir),
  ]

  if (!pedir.length && !opcional.length && !noPedir.length) {
    lineas.push('', 'No veo urgencias de compra por ahora. Sigue registrando ventas y stock.')
  }

  if (consejo) {
    lineas.push('', `Consejo: ${consejo}`)
  }

  return lineas.join('\n').trim().slice(0, LIMITE_MENSAJE_WSP)
}

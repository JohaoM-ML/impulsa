import type { OCRProductoDetectado } from '@/types'

export async function extraerProductosDeImagen(
  imageBase64: string
): Promise<{ texto: string; productos: OCRProductoDetectado[] }> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY

  if (!apiKey) {
    return mockOCR()
  }

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64.replace(/^data:image\/\w+;base64,/, '') },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    }
  )

  if (!res.ok) {
    throw new Error('Error al procesar la imagen con Google Vision')
  }

  const data = await res.json()
  const texto: string =
    data.responses?.[0]?.fullTextAnnotation?.text ||
    data.responses?.[0]?.textAnnotations?.[0]?.description ||
    ''

  return { texto, productos: parsearTextoGuia(texto) }
}

function parsearTextoGuia(texto: string): OCRProductoDetectado[] {
  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  const productos: OCRProductoDetectado[] = []

  for (const linea of lineas) {
    const match = linea.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:S\/?\s*)?(\d+(?:\.\d+)?)?/i)
    if (match) {
      productos.push({
        nombre: match[1].trim(),
        cantidad: parseFloat(match[2]),
        precio_unit: match[3] ? parseFloat(match[3]) : undefined,
      })
    }
  }

  return productos.slice(0, 20)
}

function mockOCR(): { texto: string; productos: OCRProductoDetectado[] } {
  return {
    texto: 'Arroz costeño 10 x 3.50\nAceite 5 x 8.00\nAzúcar 8 x 2.20',
    productos: [
      { nombre: 'Arroz costeño', cantidad: 10, precio_unit: 3.5 },
      { nombre: 'Aceite', cantidad: 5, precio_unit: 8 },
      { nombre: 'Azúcar', cantidad: 8, precio_unit: 2.2 },
    ],
  }
}

'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera } from 'lucide-react'

export function CamaraGuia({ onCaptura }: { onCaptura: (base64: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onCaptura(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-8">
      <Camera className="h-12 w-12 text-muted-foreground" />
      <p className="text-center text-sm text-muted-foreground">
        Toma una foto de tu guía de proveedor o sube una imagen
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <Button
        className="min-h-[48px] w-full"
        onClick={() => inputRef.current?.click()}
      >
        Seleccionar foto
      </Button>
    </div>
  )
}

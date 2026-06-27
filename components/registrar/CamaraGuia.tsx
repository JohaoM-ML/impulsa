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
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-primary/30 bg-brand-tint/45 p-8">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-background text-primary shadow-sm">
        <Camera className="h-8 w-8" />
      </span>
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
        size="xl"
        className="w-full"
        onClick={() => inputRef.current?.click()}
      >
        Seleccionar foto
      </Button>
    </div>
  )
}

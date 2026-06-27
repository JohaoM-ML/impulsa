'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GrabadoraVoz({
  onAudio,
  disabled,
}: {
  onAudio: (blob: Blob) => void
  disabled?: boolean
}) {
  const [grabando, setGrabando] = useState(false)
  const [soportado, setSoportado] = useState(true)
  const [segundos, setSegundos] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setSoportado(false)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function iniciar() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        onAudio(blob)
      }
      mr.start()
      mediaRef.current = mr
      setGrabando(true)
      setSegundos(0)
      timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000)
    } catch {
      setSoportado(false)
    }
  }

  function detener() {
    mediaRef.current?.stop()
    setGrabando(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  if (!soportado) {
    return (
      <div className="rounded-3xl border border-dashed border-primary/30 bg-brand-tint/45 p-6 text-center text-sm text-muted-foreground">
        Tu navegador no permite grabar audio. Usa la pestaña Manual o Foto.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-primary/30 bg-brand-tint/45 p-8">
      <button
        type="button"
        disabled={disabled}
        onClick={grabando ? detener : iniciar}
        className={`flex h-20 w-20 items-center justify-center rounded-3xl shadow-sm transition-colors disabled:opacity-50 ${
          grabando ? 'animate-pulse bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
        }`}
      >
        {grabando ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        {grabando
          ? `Grabando... ${segundos}s — toca para terminar`
          : 'Toca el micrófono y dime qué vendiste o compraste'}
      </p>
      {!grabando && (
        <p className="text-center text-xs text-muted-foreground">
          Ej.: &quot;vendí 3 Inca Kola y 2 panes&quot;
        </p>
      )}
    </div>
  )
}

/** Zona horaria del negocio (Perú no tiene horario de verano). */
export const TZ_PERU = 'America/Lima'

export function hoyEnPeruISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ_PERU }).format(new Date())
}

export function horaActualPeru(): { hour: number; minute: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ_PERU,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return {
    hour,
    minute,
    hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  }
}

export function fechaCortaPeru(fechaISO?: string): string {
  const base = fechaISO ? new Date(`${fechaISO}T12:00:00-05:00`) : new Date()
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TZ_PERU,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(base)
}

export function inicioDiaPeru(fechaISO?: string): string {
  const dia = fechaISO ?? hoyEnPeruISO()
  return new Date(`${dia}T00:00:00-05:00`).toISOString()
}

export function finDiaPeru(fechaISO?: string): string {
  const dia = fechaISO ?? hoyEnPeruISO()
  return new Date(`${dia}T23:59:59.999-05:00`).toISOString()
}

/** Convierte "21:00" o "21:00:00" a minutos desde medianoche. */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutosDesdeMedianochePeru(): number {
  const { hour, minute } = horaActualPeru()
  return hour * 60 + minute
}

/** Opciones de hora de cierre (cada 30 min, 17:00–23:30). */
export const HORAS_CIERRE_OPCIONES: string[] = (() => {
  const opciones: string[] = []
  for (let h = 17; h <= 23; h++) {
    opciones.push(`${String(h).padStart(2, '0')}:00`)
    opciones.push(`${String(h).padStart(2, '0')}:30`)
  }
  return opciones
})()

export function normalizarHoraCierre(hora: string): string | null {
  const match = hora.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hhmm = `${match[1].padStart(2, '0')}:${match[2]}`
  return HORAS_CIERRE_OPCIONES.includes(hhmm) ? hhmm : null
}

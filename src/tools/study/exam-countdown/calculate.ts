export interface CountdownBreakdown {
  days: number
  hours: number
  minutes: number
}

export type CountdownStatus = 'past' | 'now' | 'today' | 'upcoming'

export interface CountdownResult {
  status: CountdownStatus
  breakdown: CountdownBreakdown
  totalMs: number
}

/**
 * Combines a date input value ("YYYY-MM-DD") and an optional time input value
 * ("HH:mm") into a timestamp, interpreted in the user's local timezone.
 *
 * Deliberately does NOT use `new Date(dateString)` on the date-only string: per the
 * ECMAScript spec, a bare "YYYY-MM-DD" string is parsed as UTC midnight, not local
 * midnight, which would silently shift the countdown by the user's timezone offset.
 * Using the `new Date(year, monthIndex, day, ...)` constructor form instead is always
 * interpreted in local time, which is what we want here.
 *
 * If no time is given, the event defaults to 23:59 local time (end of the selected
 * day) — a documented, sensible default rather than treating an all-day event as
 * happening at local midnight (which would make it "already past" for most of the
 * day it was meant to cover).
 */
export function parseExamDateTime(dateValue: string, timeValue: string): number | null {
  if (!dateValue) return null

  const dateParts = dateValue.split('-').map(Number)
  if (dateParts.length !== 3 || dateParts.some((n) => !Number.isFinite(n))) return null
  const [year, month, day] = dateParts
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  let hours = 23
  let minutes = 59

  if (timeValue) {
    const timeParts = timeValue.split(':').map(Number)
    if (timeParts.length < 2 || timeParts.some((n) => !Number.isFinite(n))) return null
    const [h, m] = timeParts
    if (h < 0 || h > 23 || m < 0 || m > 59) return null
    hours = h
    minutes = m
  }

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)

  // JS silently rolls over invalid day-of-month combos (e.g. Feb 30 becomes Mar 2)
  // instead of erroring, so confirm the constructed date still matches the input.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date.getTime()
}

/** Falls back to a generic label when the user leaves the exam/event name blank. */
export function resolveExamName(rawName: string): string {
  const trimmed = rawName.trim()
  return trimmed !== '' ? trimmed : 'Evento'
}

function isSameLocalDay(a: number, b: number): boolean {
  const dateA = new Date(a)
  const dateB = new Date(b)
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

/**
 * Computes how much time remains until `targetTimestamp`, as seen from `now`.
 * Both timestamps are plain ms-since-epoch numbers so this stays pure and easy to
 * test — no `Date.now()` call lives in here.
 */
export function getCountdown(targetTimestamp: number, now: number): CountdownResult {
  const diffMs = targetTimestamp - now

  if (diffMs < 0) {
    return { status: 'past', breakdown: { days: 0, hours: 0, minutes: 0 }, totalMs: 0 }
  }
  if (diffMs === 0) {
    return { status: 'now', breakdown: { days: 0, hours: 0, minutes: 0 }, totalMs: 0 }
  }

  const totalMinutes = Math.floor(diffMs / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  const status: CountdownStatus = isSameLocalDay(targetTimestamp, now) ? 'today' : 'upcoming'

  return { status, breakdown: { days, hours, minutes }, totalMs: diffMs }
}

function pluralize(value: number, singular: string, plural: string): string {
  return value === 1 ? singular : plural
}

function formatUnit(value: number, singular: string, plural: string): string {
  return `${value} ${pluralize(value, singular, plural)}`
}

/**
 * Builds the main "Faltam..." sentence from a countdown result, always using the two
 * largest non-zero units (days+hours, or hours+minutes) — how people naturally talk
 * about time remaining — and handles Portuguese singular/plural forms.
 */
export function formatCountdownMessage(result: CountdownResult): string {
  if (result.status === 'past') return 'A data selecionada já passou.'
  if (result.status === 'now') return 'O exame é agora.'

  const { days, hours, minutes } = result.breakdown

  if (days > 0) {
    const daysPart = `Faltam ${formatUnit(days, 'dia', 'dias')}`
    return hours > 0 ? `${daysPart} e ${formatUnit(hours, 'hora', 'horas')}.` : `${daysPart}.`
  }
  if (hours > 0) {
    const hoursPart = `Faltam ${formatUnit(hours, 'hora', 'horas')}`
    return minutes > 0 ? `${hoursPart} e ${formatUnit(minutes, 'minuto', 'minutos')}.` : `${hoursPart}.`
  }
  if (minutes > 0) {
    return `Faltam ${formatUnit(minutes, 'minuto', 'minutos')}.`
  }
  return 'Faltam menos de 1 minuto.'
}

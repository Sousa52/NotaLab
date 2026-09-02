import { describe, expect, it } from 'vitest'
import {
  formatCountdownMessage,
  getCountdown,
  parseExamDateTime,
  resolveExamName,
  type CountdownResult,
} from './calculate'

/** Builds a local-timezone timestamp, matching how parseExamDateTime/getCountdown work. */
function localTime(year: number, month: number, day: number, hours = 0, minutes = 0): number {
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime()
}

describe('parseExamDateTime', () => {
  it('returns null for an empty date', () => {
    expect(parseExamDateTime('', '')).toBeNull()
  })

  it('defaults to 23:59 local time when no time is given', () => {
    expect(parseExamDateTime('2025-06-10', '')).toBe(localTime(2025, 6, 10, 23, 59))
  })

  it('uses the exact time when one is given', () => {
    expect(parseExamDateTime('2025-06-10', '14:30')).toBe(localTime(2025, 6, 10, 14, 30))
  })

  it('rejects a malformed date string', () => {
    expect(parseExamDateTime('2025-06', '')).toBeNull()
    expect(parseExamDateTime('abcd-06-10', '')).toBeNull()
  })

  it('rejects an out-of-range month or day', () => {
    expect(parseExamDateTime('2025-13-01', '')).toBeNull()
    expect(parseExamDateTime('2025-01-32', '')).toBeNull()
  })

  it('rejects a date that JS would otherwise silently roll over (Feb 30)', () => {
    expect(parseExamDateTime('2025-02-30', '')).toBeNull()
  })

  it('accepts Feb 29 on a leap year and rejects it otherwise', () => {
    expect(parseExamDateTime('2024-02-29', '')).toBe(localTime(2024, 2, 29, 23, 59))
    expect(parseExamDateTime('2023-02-29', '')).toBeNull()
  })

  it('rejects a malformed or out-of-range time', () => {
    expect(parseExamDateTime('2025-06-10', 'abc')).toBeNull()
    expect(parseExamDateTime('2025-06-10', '12')).toBeNull()
    expect(parseExamDateTime('2025-06-10', '25:00')).toBeNull()
    expect(parseExamDateTime('2025-06-10', '12:61')).toBeNull()
  })
})

describe('resolveExamName', () => {
  it('keeps a trimmed custom name', () => {
    expect(resolveExamName('  Exame de Cálculo  ')).toBe('Exame de Cálculo')
  })

  it('falls back to a generic label when blank', () => {
    expect(resolveExamName('')).toBe('Evento')
    expect(resolveExamName('   ')).toBe('Evento')
  })
})

describe('getCountdown', () => {
  it('handles a date several days away', () => {
    const now = localTime(2025, 1, 1, 10, 0)
    const target = localTime(2025, 1, 13, 10, 0)
    const result = getCountdown(target, now)
    expect(result.status).toBe('upcoming')
    expect(result.breakdown).toEqual({ days: 12, hours: 0, minutes: 0 })
  })

  it('handles a date a few hours away, later the same day', () => {
    const now = localTime(2025, 1, 1, 10, 0)
    const target = localTime(2025, 1, 1, 14, 15)
    const result = getCountdown(target, now)
    expect(result.status).toBe('today')
    expect(result.breakdown).toEqual({ days: 0, hours: 4, minutes: 15 })
  })

  it('handles a date a few minutes away', () => {
    const now = localTime(2025, 1, 1, 10, 0)
    const target = localTime(2025, 1, 1, 10, 20)
    const result = getCountdown(target, now)
    expect(result.breakdown).toEqual({ days: 0, hours: 0, minutes: 20 })
  })

  it('reports status "now" when the target is exactly now', () => {
    const now = localTime(2025, 1, 1, 10, 0)
    const result = getCountdown(now, now)
    expect(result.status).toBe('now')
    expect(result.totalMs).toBe(0)
  })

  it('reports status "past" for a date that has already passed', () => {
    const now = localTime(2025, 1, 1, 10, 0)
    const target = now - 1000
    const result = getCountdown(target, now)
    expect(result.status).toBe('past')
    expect(result.totalMs).toBe(0)
  })

  it('reports "upcoming" (not "today") when the target crosses midnight, even if it is under an hour away', () => {
    const now = localTime(2025, 1, 1, 23, 30)
    const target = localTime(2025, 1, 2, 0, 15)
    const result = getCountdown(target, now)
    expect(result.status).toBe('upcoming')
    expect(result.breakdown).toEqual({ days: 0, hours: 0, minutes: 45 })
  })

  it('reports "today" for a target later the same calendar day even close to midnight', () => {
    const now = localTime(2025, 1, 1, 0, 5)
    const target = localTime(2025, 1, 1, 23, 55)
    const result = getCountdown(target, now)
    expect(result.status).toBe('today')
  })
})

describe('formatCountdownMessage', () => {
  function message(target: number, now: number): string {
    return formatCountdownMessage(getCountdown(target, now))
  }

  it('formats days and hours together, matching the natural phrasing', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    const target = localTime(2025, 1, 4, 13, 0) // 3 days, 4 hours
    expect(message(target, now)).toBe('Faltam 3 dias e 4 horas.')
  })

  it('formats days alone when hours are exactly zero', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    const target = localTime(2025, 1, 13, 9, 0) // exactly 12 days
    expect(message(target, now)).toBe('Faltam 12 dias.')
  })

  it('formats hours and minutes together', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    const target = localTime(2025, 1, 1, 11, 15) // 2h 15min
    expect(message(target, now)).toBe('Faltam 2 horas e 15 minutos.')
  })

  it('formats hours alone when minutes are exactly zero', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    const target = localTime(2025, 1, 1, 11, 0)
    expect(message(target, now)).toBe('Faltam 2 horas.')
  })

  it('formats minutes alone', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    const target = localTime(2025, 1, 1, 9, 20)
    expect(message(target, now)).toBe('Faltam 20 minutos.')
  })

  it('uses singular forms for a value of exactly 1', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    expect(message(localTime(2025, 1, 2, 9, 0), now)).toBe('Faltam 1 dia.')
    expect(message(localTime(2025, 1, 1, 10, 0), now)).toBe('Faltam 1 hora.')
    expect(message(localTime(2025, 1, 1, 9, 1), now)).toBe('Faltam 1 minuto.')
    expect(message(localTime(2025, 1, 2, 10, 0), now)).toBe('Faltam 1 dia e 1 hora.')
    expect(message(localTime(2025, 1, 1, 10, 1), now)).toBe('Faltam 1 hora e 1 minuto.')
  })

  it('uses plural forms for values greater than 1', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    expect(message(localTime(2025, 1, 3, 9, 0), now)).toBe('Faltam 2 dias.')
    expect(message(localTime(2025, 1, 1, 11, 0), now)).toBe('Faltam 2 horas.')
    expect(message(localTime(2025, 1, 1, 9, 2), now)).toBe('Faltam 2 minutos.')
  })

  it('shows a graceful message for durations under a minute', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    const target = now + 30_000 // 30 seconds away
    expect(message(target, now)).toBe('Faltam menos de 1 minuto.')
  })

  it('shows the "now" message for a zero-difference target', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    expect(message(now, now)).toBe('O exame é agora.')
  })

  it('shows the "past" message for an already-passed target', () => {
    const now = localTime(2025, 1, 1, 9, 0)
    expect(message(now - 60_000, now)).toBe('A data selecionada já passou.')
  })

  it('is a pure function of a CountdownResult, independent of getCountdown', () => {
    const pastResult: CountdownResult = { status: 'past', breakdown: { days: 0, hours: 0, minutes: 0 }, totalMs: 0 }
    expect(formatCountdownMessage(pastResult)).toBe('A data selecionada já passou.')
  })
})

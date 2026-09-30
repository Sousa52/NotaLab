import { describe, expect, it } from 'vitest'
import {
  calculateDateDifference,
  daysBetween,
  daysInMonth,
  formatCalendarDate,
  isLeapYear,
  parseIsoDate,
} from './calculate'
import type { DateDifference } from './calculate'

// All logic under test is pure integer/calendar arithmetic — no `Date` object, no clock, no
// timezone — so these tests give identical results on any machine or TZ setting.

function diff(start: string, end: string): DateDifference {
  const result = calculateDateDifference(start, end)
  if (result.status !== 'ok') {
    throw new Error(`Expected an ok result for ${start} → ${end}, got ${result.reason}`)
  }
  return result.value
}

describe('isLeapYear', () => {
  it.each([
    [2024, true],
    [2000, true],
    [2400, true],
    [2023, false],
    [1900, false],
    [2100, false],
  ])('%i → %s', (year, expected) => {
    expect(isLeapYear(year)).toBe(expected)
  })
})

describe('daysInMonth', () => {
  it.each([
    [2023, 1, 31],
    [2023, 2, 28],
    [2024, 2, 29],
    [1900, 2, 28],
    [2000, 2, 29],
    [2023, 4, 30],
    [2023, 6, 30],
    [2023, 9, 30],
    [2023, 11, 30],
    [2023, 12, 31],
  ])('%i-%i has %i days', (year, month, expected) => {
    expect(daysInMonth(year, month)).toBe(expected)
  })
})

describe('parseIsoDate', () => {
  it('parses a valid YYYY-MM-DD date without shifting the calendar day', () => {
    expect(parseIsoDate('2024-03-15')).toEqual({ status: 'ok', date: { year: 2024, month: 3, day: 15 } })
  })

  it('trims surrounding whitespace', () => {
    expect(parseIsoDate(' 2024-03-15 ')).toEqual({ status: 'ok', date: { year: 2024, month: 3, day: 15 } })
  })

  it.each(['2024-02-29', '2000-02-29'])('accepts the leap day %s', (input) => {
    expect(parseIsoDate(input).status).toBe('ok')
  })

  it.each(['', '   '])('reports %j as empty', (input) => {
    expect(parseIsoDate(input)).toEqual({ status: 'error', reason: 'empty' })
  })

  it.each([
    '2023-02-29',
    '2100-02-29',
    '2024-02-30',
    '2024-04-31',
    '2024-13-01',
    '2024-00-10',
    '2024-01-00',
    '2024-01-32',
    'abc',
    '2024-1-1',
    '2024/01/01',
    '20240101',
    '0000-01-01',
    '2024-01-01T00:00:00',
    '+2024-01-01',
  ])('reports %j as invalid', (input) => {
    expect(parseIsoDate(input)).toEqual({ status: 'error', reason: 'invalid' })
  })
})

describe('formatCalendarDate', () => {
  it('formats as DD/MM/YYYY with zero padding', () => {
    expect(formatCalendarDate({ year: 2024, month: 3, day: 5 })).toBe('05/03/2024')
  })

  it('formats a two-digit day and month', () => {
    expect(formatCalendarDate({ year: 2024, month: 12, day: 31 })).toBe('31/12/2024')
  })
})

describe('daysBetween', () => {
  const a = { year: 2024, month: 3, day: 15 }

  it('is 0 for the same date', () => {
    expect(daysBetween(a, a)).toBe(0)
  })

  it('is positive when the end is later', () => {
    expect(daysBetween(a, { year: 2024, month: 3, day: 16 })).toBe(1)
  })

  it('is negative when the end is earlier', () => {
    expect(daysBetween(a, { year: 2024, month: 3, day: 14 })).toBe(-1)
  })
})

describe('calculateDateDifference — results', () => {
  // [start, end, totalDays, weeks, remainingDays, years, months, days]
  const cases: [string, string, number, number, number, number, number, number][] = [
    // same date and one-day differences
    ['2024-03-15', '2024-03-15', 0, 0, 0, 0, 0, 0],
    ['2024-03-15', '2024-03-16', 1, 0, 1, 0, 0, 1],
    // normal differences
    ['2024-01-01', '2024-03-15', 74, 10, 4, 0, 2, 14],
    ['2020-01-15', '2024-03-20', 1526, 218, 0, 4, 2, 5],
    // month boundaries
    ['2024-01-31', '2024-02-01', 1, 0, 1, 0, 0, 1],
    // year boundaries
    ['2023-12-31', '2024-01-01', 1, 0, 1, 0, 0, 1],
    ['2023-12-25', '2024-01-05', 11, 1, 4, 0, 0, 11],
    // leap year and February
    ['2024-02-28', '2024-03-01', 2, 0, 2, 0, 0, 2],
    ['2024-01-01', '2025-01-01', 366, 52, 2, 1, 0, 0],
    ['2020-02-29', '2024-02-29', 1461, 208, 5, 4, 0, 0],
    ['2024-02-29', '2025-02-28', 365, 52, 1, 1, 0, 0],
    ['2024-02-29', '2025-03-01', 366, 52, 2, 1, 0, 1],
    // non-leap years
    ['2023-02-28', '2023-03-01', 1, 0, 1, 0, 0, 1],
    ['2023-01-01', '2024-01-01', 365, 52, 1, 1, 0, 0],
    // exact weeks
    ['2024-03-01', '2024-03-15', 14, 2, 0, 0, 0, 14],
    ['2024-05-01', '2024-05-08', 7, 1, 0, 0, 0, 7],
    // weeks + remaining days
    ['2024-05-01', '2024-05-07', 6, 0, 6, 0, 0, 6],
    ['2024-05-01', '2024-05-11', 10, 1, 3, 0, 0, 10],
    // different month lengths (30, 31, 31, 28 days)
    ['2024-04-15', '2024-05-15', 30, 4, 2, 0, 1, 0],
    ['2024-05-15', '2024-06-15', 31, 4, 3, 0, 1, 0],
    ['2024-01-15', '2024-02-15', 31, 4, 3, 0, 1, 0],
    ['2023-02-15', '2023-03-15', 28, 4, 0, 0, 1, 0],
    // end-of-month cases (day is clamped to the end of a shorter month)
    ['2024-01-31', '2024-02-29', 29, 4, 1, 0, 1, 0],
    ['2023-01-31', '2023-02-28', 28, 4, 0, 0, 1, 0],
    ['2024-01-31', '2024-03-01', 30, 4, 2, 0, 1, 1],
    ['2024-01-31', '2024-03-31', 60, 8, 4, 0, 2, 0],
    ['2024-04-30', '2024-05-31', 31, 4, 3, 0, 1, 1],
    // DST transition dates are plain calendar days (Europe and US)
    ['2024-03-30', '2024-03-31', 1, 0, 1, 0, 0, 1],
    ['2024-10-26', '2024-10-27', 1, 0, 1, 0, 0, 1],
    ['2024-03-09', '2024-03-10', 1, 0, 1, 0, 0, 1],
    ['2024-03-01', '2024-11-01', 245, 35, 0, 0, 8, 0],
    // long spans
    ['1970-01-01', '2000-01-01', 10957, 1565, 2, 30, 0, 0],
    ['2000-01-01', '2100-01-01', 36525, 5217, 6, 100, 0, 0],
  ]

  it.each(cases)('%s → %s', (start, end, totalDays, weeks, remainingDays, years, months, days) => {
    expect(diff(start, end)).toMatchObject({
      reversed: false,
      totalDays,
      weeks,
      remainingDays,
      calendar: { years, months, days },
    })
  })

  it('returns the parsed dates as start and end', () => {
    const value = diff('2024-01-01', '2024-03-15')
    expect(value.start).toEqual({ year: 2024, month: 1, day: 1 })
    expect(value.end).toEqual({ year: 2024, month: 3, day: 15 })
  })
})

describe('calculateDateDifference — reversed dates', () => {
  it('normalizes reversed dates and flags them', () => {
    const value = diff('2024-03-15', '2024-01-01')
    expect(value.reversed).toBe(true)
    expect(value.start).toEqual({ year: 2024, month: 1, day: 1 })
    expect(value.end).toEqual({ year: 2024, month: 3, day: 15 })
    expect(value).toMatchObject({
      totalDays: 74,
      weeks: 10,
      remainingDays: 4,
      calendar: { years: 0, months: 2, days: 14 },
    })
  })

  it('gives the same numbers whichever order the dates are entered in', () => {
    const pairs: [string, string][] = [
      ['2020-02-29', '2024-02-29'],
      ['2024-01-31', '2024-03-01'],
      ['2023-12-31', '2024-01-01'],
      ['1970-01-01', '2000-01-01'],
    ]
    for (const [a, b] of pairs) {
      const forward = diff(a, b)
      const backward = diff(b, a)
      expect(backward).toEqual({ ...forward, reversed: true })
    }
  })

  it('does not flag the same date as reversed', () => {
    expect(diff('2024-03-15', '2024-03-15').reversed).toBe(false)
  })

  it('does not flag correctly ordered dates as reversed', () => {
    expect(diff('2024-03-15', '2024-03-16').reversed).toBe(false)
  })
})

describe('calculateDateDifference — validation', () => {
  it.each([
    ['', '2024-01-01'],
    ['2024-01-01', ''],
    ['', ''],
    ['   ', '2024-01-01'],
  ])('reports empty input (%j, %j)', (start, end) => {
    const result = calculateDateDifference(start, end)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.reason).toBe('empty')
    }
  })

  it.each([
    ['2024-02-30', '2024-03-01'],
    ['2024-03-01', '2023-02-29'],
    ['abc', 'def'],
  ])('reports invalid dates (%j, %j)', (start, end) => {
    const result = calculateDateDifference(start, end)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.reason).toBe('invalid')
    }
  })

  it('reports invalid (not empty) when one date is empty and the other is invalid', () => {
    const result = calculateDateDifference('', 'nope')
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.reason).toBe('invalid')
    }
  })

  it('includes a non-empty message on errors', () => {
    const result = calculateDateDifference('', '')
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })
})

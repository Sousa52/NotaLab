// Pure date-difference logic — no React, no DOM, no eval/Function, and no `Date` object.
// Inputs are treated as calendar dates (year/month/day), never as timestamps, so the
// results cannot be shifted by the machine's timezone or by DST transitions. Day counts
// use integer day-number arithmetic (proleptic Gregorian calendar), and the
// years/months/days breakdown uses real month lengths — never 30-day months or 365-day years.

export interface CalendarDate {
  /** Full year, 1–9999. */
  year: number
  /** Month, 1–12. */
  month: number
  /** Day of month, 1–31. */
  day: number
}

export interface CalendarDifference {
  years: number
  months: number
  days: number
}

export interface DateDifference {
  /** The earlier of the two dates (after normalization). */
  start: CalendarDate
  /** The later of the two dates (after normalization). */
  end: CalendarDate
  /** True when the inputs were given with the final date before the initial date. */
  reversed: boolean
  /** Total number of calendar days between the two dates. */
  totalDays: number
  /** Complete weeks contained in `totalDays`. */
  weeks: number
  /** Days left over after removing the complete weeks (0–6). */
  remainingDays: number
  calendar: CalendarDifference
}

export type ParseDateResult =
  | { status: 'ok'; date: CalendarDate }
  | { status: 'error'; reason: 'empty' | 'invalid' }

export type DateDifferenceResult =
  | { status: 'ok'; value: DateDifference }
  | { status: 'error'; reason: 'empty' | 'invalid'; message: string }

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
    default:
      return 31
  }
}

/**
 * Parses a strict `YYYY-MM-DD` string (the value format of `<input type="date">`) into a
 * calendar date. The string is parsed manually — never through `new Date(...)`, which reads
 * date-only ISO strings as UTC and can shift the calendar day in local time.
 */
export function parseIsoDate(input: string): ParseDateResult {
  const trimmed = input.trim()
  if (trimmed === '') return { status: 'error', reason: 'empty' }

  const match = ISO_DATE_PATTERN.exec(trimmed)
  if (!match) return { status: 'error', reason: 'invalid' }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { status: 'error', reason: 'invalid' }
  }

  return { status: 'ok', date: { year, month, day } }
}

/** Formats a calendar date as `DD/MM/YYYY` (pt-PT convention). */
export function formatCalendarDate(date: CalendarDate): string {
  const day = String(date.day).padStart(2, '0')
  const month = String(date.month).padStart(2, '0')
  const year = String(date.year).padStart(4, '0')
  return `${day}/${month}/${year}`
}

/** Negative when `a` is before `b`, zero when equal, positive when `a` is after `b`. */
function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

/**
 * Days since 1970-01-01 for a calendar date, using pure integer arithmetic
 * (proleptic Gregorian calendar). No timezone or DST is involved.
 */
function toDayNumber(date: CalendarDate): number {
  const y = date.month <= 2 ? date.year - 1 : date.year
  const era = Math.floor(y / 400)
  const yearOfEra = y - era * 400
  const monthIndexFromMarch = (date.month + 9) % 12
  const dayOfYear = Math.floor((153 * monthIndexFromMarch + 2) / 5) + date.day - 1
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
  return era * 146097 + dayOfEra - 719468
}

/** Signed number of calendar days from `start` to `end` (negative when `end` is earlier). */
export function daysBetween(start: CalendarDate, end: CalendarDate): number {
  return toDayNumber(end) - toDayNumber(start)
}

/**
 * Adds whole months to a date. When the target month is shorter than the original day
 * (e.g. 31 Jan + 1 month), the day is clamped to the last day of the target month.
 */
function addMonths(date: CalendarDate, months: number): CalendarDate {
  const monthIndex = date.year * 12 + (date.month - 1) + months
  const year = Math.floor(monthIndex / 12)
  const month = (monthIndex % 12) + 1
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) }
}

/**
 * Years/months/days between two dates, where `start` is not after `end`.
 * Counts the largest number of whole months that can be added to `start` without passing
 * `end` (clamping to month end when needed), then counts the remaining real calendar days.
 * The result is never negative.
 */
function calculateCalendarDifference(start: CalendarDate, end: CalendarDate): CalendarDifference {
  let totalMonths = (end.year - start.year) * 12 + (end.month - start.month)
  if (compareCalendarDates(addMonths(start, totalMonths), end) > 0) {
    totalMonths -= 1
  }

  const anchor = addMonths(start, totalMonths)
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: daysBetween(anchor, end),
  }
}

/**
 * Calculates the difference between two `YYYY-MM-DD` date strings. If the final date is
 * before the initial one, the dates are swapped and `reversed` is set to true so the UI
 * can tell the user.
 */
export function calculateDateDifference(startInput: string, endInput: string): DateDifferenceResult {
  const parsedStart = parseIsoDate(startInput)
  const parsedEnd = parseIsoDate(endInput)

  if (parsedStart.status === 'error' || parsedEnd.status === 'error') {
    const hasInvalid =
      (parsedStart.status === 'error' && parsedStart.reason === 'invalid') ||
      (parsedEnd.status === 'error' && parsedEnd.reason === 'invalid')

    return hasInvalid
      ? { status: 'error', reason: 'invalid', message: 'Introduz datas válidas.' }
      : { status: 'error', reason: 'empty', message: 'Indica a data inicial e a data final.' }
  }

  const reversed = compareCalendarDates(parsedStart.date, parsedEnd.date) > 0
  const start = reversed ? parsedEnd.date : parsedStart.date
  const end = reversed ? parsedStart.date : parsedEnd.date

  const totalDays = daysBetween(start, end)

  return {
    status: 'ok',
    value: {
      start,
      end,
      reversed,
      totalDays,
      weeks: Math.floor(totalDays / 7),
      remainingDays: totalDays % 7,
      calendar: calculateCalendarDifference(start, end),
    },
  }
}

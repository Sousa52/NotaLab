import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { calculateDateDifference, formatCalendarDate, parseIsoDate } from './calculate'

/** Joins parts as "a, b e c" using the translated conjunction. */
function joinParts(parts: string[], and: string): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} ${and} ${parts[parts.length - 1]}`
}

export function DateDifferenceTool() {
  const t = useI18n()
  const s = t.dateDifference
  const [startRaw, setStartRaw] = useState('')
  const [endRaw, setEndRaw] = useState('')

  function handleReset() {
    setStartRaw('')
    setEndRaw('')
  }

  // Per-field errors only for non-empty, malformed values; empty fields just show the empty state.
  const parsedStart = parseIsoDate(startRaw)
  const parsedEnd = parseIsoDate(endRaw)
  const startError =
    parsedStart.status === 'error' && parsedStart.reason === 'invalid' ? s.invalidDate : undefined
  const endError = parsedEnd.status === 'error' && parsedEnd.reason === 'invalid' ? s.invalidDate : undefined

  const result = calculateDateDifference(startRaw, endRaw)

  const weeksText =
    result.status === 'ok'
      ? joinParts(
          [
            s.weekUnit(result.value.weeks),
            ...(result.value.remainingDays > 0 ? [s.dayUnit(result.value.remainingDays)] : []),
          ],
          s.listAnd,
        )
      : ''

  let calendarText = ''
  if (result.status === 'ok') {
    const { years, months, days } = result.value.calendar
    const parts = [
      ...(years > 0 ? [s.yearUnit(years)] : []),
      ...(months > 0 ? [s.monthUnit(months)] : []),
      ...(days > 0 ? [s.dayUnit(days)] : []),
    ]
    calendarText = parts.length > 0 ? joinParts(parts, s.listAnd) : s.dayUnit(0)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          type="date"
          label={s.startLabel}
          min="0001-01-01"
          max="9999-12-31"
          value={startRaw}
          onChange={(e) => setStartRaw(e.target.value)}
          error={startError}
        />
        <Field
          type="date"
          label={s.endLabel}
          min="0001-01-01"
          max="9999-12-31"
          value={endRaw}
          onChange={(e) => setEndRaw(e.target.value)}
          error={endError}
        />
      </div>

      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t.common.clear}
      </Button>

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {result.status === 'error' && result.reason === 'empty' && (
          <p className="text-sm text-ink-600">{s.emptyState}</p>
        )}

        {result.status === 'error' && result.reason === 'invalid' && (
          <p className="text-sm font-medium text-red-700">{s.invalidState}</p>
        )}

        {result.status === 'ok' && (
          <div className="space-y-4">
            {result.value.reversed && (
              <p className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-800">
                {s.reversedNotice(formatCalendarDate(result.value.start), formatCalendarDate(result.value.end))}
              </p>
            )}

            {result.value.totalDays === 0 && <p className="text-sm text-ink-600">{s.sameDateNotice}</p>}

            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-ink-600">{s.totalTitle}</dt>
                <dd className="mt-0.5 text-3xl font-semibold text-ink-950">
                  {s.dayUnit(result.value.totalDays)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink-600">{s.weeksTitle}</dt>
                <dd className="mt-0.5 text-xl font-semibold text-ink-950">{weeksText}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink-600">{s.calendarTitle}</dt>
                <dd className="mt-0.5 text-xl font-semibold text-ink-950">{calendarText}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">{s.howItWorksTitle}</h2>
        <p className="mt-2">{s.howItWorks}</p>
      </div>
    </div>
  )
}

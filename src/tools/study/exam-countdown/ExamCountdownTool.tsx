import { useState } from 'react'
import { CalendarCheck, Hourglass, RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import {
  formatCountdownMessage,
  getCountdown,
  parseExamDateTime,
  resolveExamName,
} from './calculate'
import { useNow } from './useNow'

export function ExamCountdownTool() {
  const t = useI18n()
  const [name, setName] = useState('')
  const [dateRaw, setDateRaw] = useState('')
  const [timeRaw, setTimeRaw] = useState('')
  const now = useNow()

  function handleReset() {
    setName('')
    setDateRaw('')
    setTimeRaw('')
  }

  const hasDate = dateRaw !== ''
  const target = hasDate ? parseExamDateTime(dateRaw, timeRaw) : null
  const isInvalid = hasDate && target === null

  const countdown = target !== null ? getCountdown(target, now) : null
  const message = countdown ? formatCountdownMessage(countdown) : null

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Field
          label={t.examCountdown.nameLabel}
          placeholder={t.examCountdown.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.examCountdown.dateLabel}
            type="date"
            value={dateRaw}
            onChange={(e) => setDateRaw(e.target.value)}
            error={isInvalid ? t.examCountdown.invalidDate : undefined}
          />
          <Field
            label={t.examCountdown.timeLabel}
            type="time"
            value={timeRaw}
            onChange={(e) => setTimeRaw(e.target.value)}
            hint={t.examCountdown.timeHint}
          />
        </div>
      </div>

      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t.common.clear}
      </Button>

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {!hasDate && <p className="text-sm text-ink-600">{t.examCountdown.emptyState}</p>}

        {isInvalid && <p className="text-sm font-medium text-red-700">{t.examCountdown.invalidDate}</p>}

        {countdown && message && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Hourglass className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <p className="font-medium text-ink-800">{resolveExamName(name)}</p>
              {countdown.status === 'today' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  <CalendarCheck className="h-3 w-3" aria-hidden="true" />
                  {t.examCountdown.todayBadge}
                </span>
              )}
            </div>

            <p className="text-2xl font-semibold text-ink-950">{message}</p>

            {(countdown.status === 'today' || countdown.status === 'upcoming') && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border border-ink-200 bg-white px-3 py-2 text-center">
                  <p className="text-xl font-semibold text-ink-950">{countdown.breakdown.days}</p>
                  <p className="text-xs text-ink-600">{t.examCountdown.daysLabel}</p>
                </div>
                <div className="rounded-md border border-ink-200 bg-white px-3 py-2 text-center">
                  <p className="text-xl font-semibold text-ink-950">{countdown.breakdown.hours}</p>
                  <p className="text-xs text-ink-600">{t.examCountdown.hoursLabel}</p>
                </div>
                <div className="rounded-md border border-ink-200 bg-white px-3 py-2 text-center">
                  <p className="text-xl font-semibold text-ink-950">{countdown.breakdown.minutes}</p>
                  <p className="text-xs text-ink-600">{t.examCountdown.minutesLabel}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.examCountdown.howItWorks}</p>
      </div>
    </div>
  )
}

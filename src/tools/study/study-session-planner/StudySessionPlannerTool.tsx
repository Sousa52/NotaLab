import { useId, useState } from 'react'
import { Coffee, ListChecks, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { parseLocaleNumber } from '../../../lib/validation'
import { combineHoursAndMinutes, formatDuration, generateStudyPlan, type StudyPlanResult } from './calculate'

interface SubjectRow {
  id: string
  name: string
}

function createRow(id: string): SubjectRow {
  return { id, name: '' }
}

let rowCounter = 0
function nextId() {
  rowCounter += 1
  return `subject-${rowCounter}`
}

function createInitialRows(): SubjectRow[] {
  return [createRow(nextId()), createRow(nextId())]
}

export function StudySessionPlannerTool() {
  const t = useI18n()
  const [hoursRaw, setHoursRaw] = useState('')
  const [minutesRaw, setMinutesRaw] = useState('30')
  const [rows, setRows] = useState<SubjectRow[]>(createInitialRows)
  const [planResult, setPlanResult] = useState<StudyPlanResult | null>(null)
  const resultRegionId = useId()

  function updateRow(id: string, name: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, name } : row)))
  }

  function addRow() {
    setRows((current) => [...current, createRow(nextId())])
  }

  function removeRow(id: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current))
  }

  function handleReset() {
    setHoursRaw('')
    setMinutesRaw('30')
    setRows(createInitialRows())
    setPlanResult(null)
  }

  const parsedHours = parseLocaleNumber(hoursRaw)
  const parsedMinutes = parseLocaleNumber(minutesRaw)

  const hoursError =
    hoursRaw.trim() !== '' && (parsedHours === null || parsedHours < 0)
      ? t.studyPlanner.invalidNumber
      : undefined
  const minutesError =
    minutesRaw.trim() !== '' && (parsedMinutes === null || parsedMinutes < 0)
      ? t.studyPlanner.invalidNumber
      : undefined

  const canGenerate = !hoursError && !minutesError

  function handleGenerate() {
    if (!canGenerate) return
    const totalMinutes = combineHoursAndMinutes(parsedHours ?? 0, parsedMinutes ?? 0)
    const subjectNames = rows.map((row) => row.name)
    setPlanResult(generateStudyPlan(totalMinutes, subjectNames))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.studyPlanner.hoursLabel}
          inputMode="decimal"
          placeholder="0"
          value={hoursRaw}
          onChange={(e) => setHoursRaw(e.target.value)}
          error={hoursError}
        />
        <Field
          label={t.studyPlanner.minutesLabel}
          inputMode="decimal"
          placeholder="30"
          value={minutesRaw}
          onChange={(e) => setMinutesRaw(e.target.value)}
          error={minutesError}
        />
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <fieldset key={row.id} className="rounded-lg border border-ink-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="px-1 text-xs font-medium text-ink-500">
                {t.studyPlanner.subjectLegend(index + 1)}
              </legend>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={t.studyPlanner.removeSubject(index + 1)}
                  className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="mt-2">
              <Field
                label={t.studyPlanner.subjectNameLabel}
                placeholder={t.studyPlanner.subjectNamePlaceholder}
                value={row.name}
                onChange={(e) => updateRow(row.id, e.target.value)}
              />
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={addRow}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.studyPlanner.addSubject}
        </Button>
        <Button type="button" onClick={handleGenerate} disabled={!canGenerate}>
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          {t.studyPlanner.generate}
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t.common.clear}
        </Button>
      </div>

      <div id={resultRegionId} aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {planResult === null && <p className="text-sm text-ink-600">{t.studyPlanner.emptyState}</p>}

        {planResult?.status === 'invalid-duration' && (
          <p className="text-sm font-medium text-red-700">{t.studyPlanner.invalidDuration}</p>
        )}

        {planResult?.status === 'no-subjects' && (
          <p className="text-sm font-medium text-red-700">{t.studyPlanner.noSubjects}</p>
        )}

        {planResult?.status === 'ok' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-600">
              <p>
                {t.studyPlanner.totalLabel}{' '}
                <span className="font-semibold text-ink-950">
                  {formatDuration(planResult.plan.totalMinutes)}
                </span>
              </p>
              <p>
                {t.studyPlanner.subjectCountLabel}{' '}
                <span className="font-semibold text-ink-950">{planResult.plan.subjectCount}</span>
              </p>
            </div>

            <ol className="space-y-2">
              {planResult.plan.sessions.map((session, index) => (
                <li
                  key={`${session.name}-${index}`}
                  className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="text-ink-950">
                    {index + 1}. {session.name}
                  </span>
                  <span className="font-medium text-ink-800">{formatDuration(session.minutes)}</span>
                </li>
              ))}
            </ol>

            <p className="flex items-start gap-2 text-sm text-ink-600">
              <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              {planResult.plan.breakSuggestion
                ? t.studyPlanner.breakSuggestion(
                    planResult.plan.breakSuggestion.count,
                    planResult.plan.breakSuggestion.minutesEach,
                  )
                : t.studyPlanner.noBreakNeeded}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.studyPlanner.howItWorks}</p>
      </div>
    </div>
  )
}

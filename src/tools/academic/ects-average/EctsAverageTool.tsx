import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { isPositive, isValidGrade, parseLocaleNumber } from '../../../lib/validation'
import { calculateEctsAverage, type EctsSubject } from './calculate'

interface Row {
  id: string
  name: string
  grade: string
  ects: string
}

function createRow(id: string): Row {
  return { id, name: '', grade: '', ects: '' }
}

let rowCounter = 0
function nextId() {
  rowCounter += 1
  return `ects-row-${rowCounter}`
}

export function EctsAverageTool() {
  const t = useI18n()
  const s = t.ectsAverage
  const [rows, setRows] = useState<Row[]>([createRow(nextId()), createRow(nextId())])

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((current) => [...current, createRow(nextId())])
  }

  function removeRow(id: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current))
  }

  const entries = rows.map((row) => {
    const grade = parseLocaleNumber(row.grade)
    const ects = parseLocaleNumber(row.ects)

    let gradeError: string | undefined
    if (row.grade.trim() === '') gradeError = s.gradeRequired
    else if (grade === null || !isValidGrade(grade)) gradeError = s.gradeInvalid

    let ectsError: string | undefined
    if (row.ects.trim() === '') ectsError = s.ectsRequired
    else if (ects === null || !isPositive(ects)) ectsError = s.ectsInvalid

    return { row, grade, ects, gradeError, ectsError }
  })

  const validSubjects: EctsSubject[] = []
  for (const entry of entries) {
    if (entry.grade !== null && entry.ects !== null && !entry.gradeError && !entry.ectsError) {
      validSubjects.push({ grade: entry.grade, ects: entry.ects })
    }
  }

  // Same rule as the other academic tools: every row must be valid before calculating.
  const canCalculate = rows.length > 0 && validSubjects.length === rows.length
  const result = canCalculate ? calculateEctsAverage(validSubjects) : null

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {entries.map(({ row, gradeError, ectsError }, index) => (
          <fieldset key={row.id} className="rounded-lg border border-ink-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="px-1 text-xs font-medium text-ink-500">{s.rowLegend(index + 1)}</legend>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={s.removeRow(index + 1)}
                  className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_140px_140px]">
              <Field
                label={s.nameLabel}
                placeholder={s.namePlaceholder}
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
              />
              <Field
                label={s.gradeLabel}
                inputMode="decimal"
                placeholder={s.gradePlaceholder}
                value={row.grade}
                onChange={(e) => updateRow(row.id, { grade: e.target.value })}
                error={gradeError}
              />
              <Field
                label={s.ectsLabel}
                inputMode="decimal"
                placeholder={s.ectsPlaceholder}
                value={row.ects}
                onChange={(e) => updateRow(row.id, { ects: e.target.value })}
                error={ectsError}
              />
            </div>
          </fieldset>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={addRow}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {s.addSubject}
      </Button>

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {result === null && <p className="text-sm text-ink-600">{s.emptyState}</p>}

        {result?.status === 'error' && <p className="text-sm font-medium text-red-700">{result.message}</p>}

        {result?.status === 'ok' && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-ink-600">{s.averageLabel}</p>
              <p className="mt-1 text-3xl font-semibold text-ink-950">{formatGrade(result.average)} / 20</p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600">{s.totalEctsLabel}</p>
              <p className="mt-1 text-2xl font-semibold text-ink-950">{formatGrade(result.totalEcts)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600">{s.subjectCountLabel}</p>
              <p className="mt-1 text-2xl font-semibold text-ink-950">{result.subjectCount}</p>
            </div>
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

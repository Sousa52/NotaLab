import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { isPositive, isValidGrade, parseLocaleNumber } from '../../../lib/validation'
import { calculateEctsAverage, calculateSimpleAverage } from './calculate'

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
  return `degree-row-${rowCounter}`
}

export function DegreeAverageTool() {
  const t = useI18n()
  const [rows, setRows] = useState<Row[]>([createRow(nextId()), createRow(nextId())])
  const resultRegionId = useId()

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((current) => [...current, createRow(nextId())])
  }

  function removeRow(id: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current))
  }

  const parsedRows = rows.map((row) => {
    const grade = parseLocaleNumber(row.grade)
    const ects = parseLocaleNumber(row.ects)

    let gradeError: string | undefined
    if (row.grade.trim() === '') gradeError = 'Indica a nota.'
    else if (grade === null || !isValidGrade(grade)) gradeError = 'Nota entre 0 e 20.'

    let ectsError: string | undefined
    if (row.ects.trim() === '') ectsError = 'Indica os ECTS.'
    else if (ects === null || !isPositive(ects)) ectsError = 'ECTS maior que 0.'

    return { ...row, grade, ects, gradeError, ectsError }
  })

  const hasErrors = parsedRows.some((row) => row.gradeError || row.ectsError)
  const validSubjects = parsedRows
    .filter((row) => row.grade !== null && row.ects !== null && !row.gradeError && !row.ectsError)
    .map((row) => ({ grade: row.grade as number, ects: row.ects as number }))

  const canCalculate = !hasErrors && validSubjects.length === rows.length && rows.length > 0
  const simpleAverage = canCalculate ? calculateSimpleAverage(validSubjects) : null
  const ectsAverage = canCalculate ? calculateEctsAverage(validSubjects) : null

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {rows.map((row, index) => (
          <fieldset key={row.id} className="rounded-lg border border-ink-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="px-1 text-xs font-medium text-ink-500">
                Unidade curricular {index + 1}
              </legend>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={`Remover unidade curricular ${index + 1}`}
                  className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_140px_140px]">
              <Field
                label="Unidade curricular"
                placeholder="Ex.: Álgebra Linear"
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
              />
              <Field
                label="Nota (0–20)"
                inputMode="decimal"
                placeholder="15"
                value={row.grade}
                onChange={(e) => updateRow(row.id, { grade: e.target.value })}
                error={parsedRows[index].gradeError}
              />
              <Field
                label="ECTS"
                inputMode="decimal"
                placeholder="6"
                value={row.ects}
                onChange={(e) => updateRow(row.id, { ects: e.target.value })}
                error={parsedRows[index].ectsError}
              />
            </div>
          </fieldset>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={addRow}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t.common.add} unidade curricular
      </Button>

      <div
        id={resultRegionId}
        aria-live="polite"
        className="grid gap-4 rounded-lg border border-ink-200 bg-ink-50 p-6 sm:grid-cols-2"
      >
        {simpleAverage !== null && ectsAverage !== null ? (
          <>
            <div>
              <p className="text-sm font-medium text-ink-600">Média simples</p>
              <p className="mt-1 text-2xl font-semibold text-ink-950">
                {formatGrade(simpleAverage)} / 20
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600">Média ponderada por ECTS</p>
              <p className="mt-1 text-2xl font-semibold text-ink-950">
                {formatGrade(ectsAverage)} / 20
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-600 sm:col-span-2">
            Preenche a nota e os ECTS de todas as unidades curriculares para veres os resultados.
          </p>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">
          A média simples trata todas as unidades curriculares por igual. A média ponderada por
          ECTS dá mais peso às unidades curriculares com mais créditos, que costuma ser a forma
          usada para calcular a média final do curso — mas as regras exatas de classificação
          variam entre instituições. Esta calculadora é genérica e não reproduz a fórmula oficial
          de nenhuma universidade em particular.
        </p>
      </div>
    </div>
  )
}

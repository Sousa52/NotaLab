import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { isValidGrade, isValidPercentage, parseLocaleNumber } from '../../../lib/validation'
import { calculateWeightedAverage, isCompleteWeight, totalWeight } from './calculate'

interface Row {
  id: string
  name: string
  grade: string
  weight: string
}

function createRow(id: string): Row {
  return { id, name: '', grade: '', weight: '' }
}

let rowCounter = 0
function nextId() {
  rowCounter += 1
  return `row-${rowCounter}`
}

export function WeightedAverageTool() {
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
    const weight = parseLocaleNumber(row.weight)

    let gradeError: string | undefined
    if (row.grade.trim() === '') gradeError = 'Indica a nota.'
    else if (grade === null || !isValidGrade(grade)) gradeError = 'Nota entre 0 e 20.'

    let weightError: string | undefined
    if (row.weight.trim() === '') weightError = 'Indica o peso.'
    else if (weight === null || !isValidPercentage(weight)) weightError = 'Peso entre 0 e 100%.'

    return { ...row, grade, weight, gradeError, weightError }
  })

  const hasErrors = parsedRows.some((row) => row.gradeError || row.weightError)
  const validComponents = parsedRows
    .filter((row) => row.grade !== null && row.weight !== null && !row.gradeError && !row.weightError)
    .map((row) => ({ grade: row.grade as number, weight: row.weight as number }))

  const canCalculate = !hasErrors && validComponents.length === rows.length && rows.length > 0
  const average = canCalculate ? calculateWeightedAverage(validComponents) : null
  const weightSum = totalWeight(validComponents)
  const weightIsComplete = validComponents.length > 0 && isCompleteWeight(validComponents)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {rows.map((row, index) => (
          <fieldset key={row.id} className="rounded-lg border border-ink-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <legend className="px-1 text-xs font-medium text-ink-500">Componente {index + 1}</legend>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={`Remover componente ${index + 1}`}
                  className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_140px_140px]">
              <Field
                label="Nome"
                placeholder="Ex.: Trabalho"
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
              />
              <Field
                label="Nota (0–20)"
                inputMode="decimal"
                placeholder="14"
                value={row.grade}
                onChange={(e) => updateRow(row.id, { grade: e.target.value })}
                error={parsedRows[index].gradeError}
              />
              <Field
                label="Peso (%)"
                inputMode="decimal"
                placeholder="40"
                value={row.weight}
                onChange={(e) => updateRow(row.id, { weight: e.target.value })}
                error={parsedRows[index].weightError}
              />
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={addRow}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.common.add} componente
        </Button>
        <p className={`text-sm ${weightIsComplete ? 'text-ink-600' : 'text-amber-700'}`}>
          Peso total: {formatGrade(weightSum)}%
          {validComponents.length > 0 && !weightIsComplete && ' — os pesos não somam 100%'}
        </p>
      </div>

      <div
        id={resultRegionId}
        aria-live="polite"
        className="rounded-lg border border-ink-200 bg-ink-50 p-6"
      >
        {average !== null ? (
          <>
            <p className="text-sm font-medium text-ink-600">{t.common.result}</p>
            <p className="mt-1 text-3xl font-semibold text-ink-950">{formatGrade(average)} / 20</p>
          </>
        ) : (
          <p className="text-sm text-ink-600">
            Preenche a nota e o peso de todos os componentes para veres o resultado.
          </p>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">
          A média ponderada multiplica cada nota pelo respetivo peso, soma os resultados e divide
          pela soma dos pesos. Se os pesos não somarem 100%, o cálculo é feito na mesma
          proporcionalmente, mas o aviso ajuda a confirmar que não falta nenhum componente.
        </p>
      </div>
    </div>
  )
}

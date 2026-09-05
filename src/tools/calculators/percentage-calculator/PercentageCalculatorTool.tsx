import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import type { TranslationDict } from '../../../i18n/pt-PT'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import {
  percentOfNumber,
  percentageDecrease,
  percentageDifference,
  percentageIncrease,
  whatPercentage,
  type PercentageResult,
} from './calculate'

type OperationId = 'percentOf' | 'whatPercentage' | 'increase' | 'decrease' | 'difference'

interface OperationConfig {
  id: OperationId
  label: string
  firstFieldLabel: string
  firstFieldSuffix?: string
  secondFieldLabel: string
  secondFieldSuffix?: string
  isPercentageResult: boolean
  compute: (first: number, second: number) => PercentageResult
}

function getOperations(t: TranslationDict): OperationConfig[] {
  const s = t.percentageCalculator
  return [
    {
      id: 'percentOf',
      label: s.opPercentOf,
      firstFieldLabel: s.percentageLabel,
      firstFieldSuffix: '%',
      secondFieldLabel: s.valueLabel,
      isPercentageResult: false,
      compute: percentOfNumber,
    },
    {
      id: 'whatPercentage',
      label: s.opWhatPercentage,
      firstFieldLabel: s.partLabel,
      secondFieldLabel: s.totalLabel,
      isPercentageResult: true,
      compute: whatPercentage,
    },
    {
      id: 'increase',
      label: s.opIncrease,
      firstFieldLabel: s.originalLabel,
      secondFieldLabel: s.percentageLabel,
      secondFieldSuffix: '%',
      isPercentageResult: false,
      compute: percentageIncrease,
    },
    {
      id: 'decrease',
      label: s.opDecrease,
      firstFieldLabel: s.originalLabel,
      secondFieldLabel: s.percentageLabel,
      secondFieldSuffix: '%',
      isPercentageResult: false,
      compute: percentageDecrease,
    },
    {
      id: 'difference',
      label: s.opDifference,
      firstFieldLabel: s.firstValueLabel,
      secondFieldLabel: s.secondValueLabel,
      isPercentageResult: true,
      compute: percentageDifference,
    },
  ]
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
}

/** Mirrors Field's visual language for a native <select>; kept local since only a few tools need it. */
function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const selectId = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-ink-800">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function PercentageCalculatorTool() {
  const t = useI18n()
  const operations = getOperations(t)
  const [operationId, setOperationId] = useState<OperationId>('percentOf')
  const [firstRaw, setFirstRaw] = useState('')
  const [secondRaw, setSecondRaw] = useState('')

  const operation = operations.find((op) => op.id === operationId) ?? operations[0]

  function handleOperationChange(nextId: OperationId) {
    setOperationId(nextId)
    setFirstRaw('')
    setSecondRaw('')
  }

  function handleReset() {
    setFirstRaw('')
    setSecondRaw('')
  }

  const parsedFirst = parseLocaleNumber(firstRaw)
  const parsedSecond = parseLocaleNumber(secondRaw)

  const firstError =
    firstRaw.trim() !== '' && parsedFirst === null ? t.percentageCalculator.invalidValue : undefined
  const secondError =
    secondRaw.trim() !== '' && parsedSecond === null ? t.percentageCalculator.invalidValue : undefined

  const canCompute = parsedFirst !== null && parsedSecond !== null && !firstError && !secondError
  const result =
    parsedFirst !== null && parsedSecond !== null && canCompute
      ? operation.compute(parsedFirst, parsedSecond)
      : null

  return (
    <div className="space-y-6">
      <SelectField
        label={t.percentageCalculator.operationLabel}
        value={operationId}
        onChange={(value) => handleOperationChange(value as OperationId)}
        options={operations.map((op) => ({ id: op.id, label: op.label }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={operation.firstFieldLabel}
          inputMode="decimal"
          placeholder="0"
          value={firstRaw}
          onChange={(e) => setFirstRaw(e.target.value)}
          error={firstError}
          suffix={operation.firstFieldSuffix}
        />
        <Field
          label={operation.secondFieldLabel}
          inputMode="decimal"
          placeholder="0"
          value={secondRaw}
          onChange={(e) => setSecondRaw(e.target.value)}
          error={secondError}
          suffix={operation.secondFieldSuffix}
        />
      </div>

      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t.common.clear}
      </Button>

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {result === null && <p className="text-sm text-ink-600">{t.percentageCalculator.emptyState}</p>}

        {result?.status === 'error' && (
          <p className="text-sm font-medium text-red-700">{result.message}</p>
        )}

        {result?.status === 'ok' && (
          <>
            <p className="text-sm font-medium text-ink-600">{t.common.result}</p>
            <p className="mt-0.5 text-3xl font-semibold text-ink-950">
              {formatGrade(result.value)}
              {operation.isPercentageResult ? '%' : ''}
            </p>
          </>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.percentageCalculator.howItWorks}</p>
      </div>
    </div>
  )
}

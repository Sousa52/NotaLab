import { useId, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import {
  GRADE_SCALES,
  convertGrade,
  getGradeScale,
  isValueInScaleRange,
  type GradeScaleId,
} from './calculate'

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

export function GradeConverterTool() {
  const t = useI18n()
  const [fromScale, setFromScale] = useState<GradeScaleId>('pt20')
  const [toScale, setToScale] = useState<GradeScaleId>('percentage')
  const [rawValue, setRawValue] = useState('')
  const resultRegionId = useId()

  function handleSwap() {
    setFromScale(toScale)
    setToScale(fromScale)
  }

  const parsedValue = parseLocaleNumber(rawValue)
  const fromScaleDefinition = getGradeScale(fromScale)
  const toScaleDefinition = getGradeScale(toScale)

  const isEmpty = rawValue.trim() === ''
  const isParseError = !isEmpty && parsedValue === null
  const isOutOfRange = parsedValue !== null && !isValueInScaleRange(parsedValue, fromScale)

  const errorMessage = isParseError
    ? t.gradeConverter.invalidValue
    : isOutOfRange
      ? t.gradeConverter.outOfRange(fromScaleDefinition.min, fromScaleDefinition.max)
      : undefined

  const convertedValue =
    parsedValue !== null && !isParseError && !isOutOfRange
      ? convertGrade(parsedValue, fromScale, toScale)
      : null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div className="space-y-4">
          <SelectField
            label={t.gradeConverter.fromScaleLabel}
            value={fromScale}
            onChange={(value) => setFromScale(value as GradeScaleId)}
            options={GRADE_SCALES.map((s) => ({ id: s.id, label: s.label }))}
          />
          <Field
            label={t.gradeConverter.valueLabel}
            inputMode="decimal"
            placeholder="14"
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            error={errorMessage}
          />
        </div>

        <div className="flex justify-center pb-2.5 sm:pb-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSwap}
            aria-label={t.gradeConverter.swapLabel}
            className="rounded-full"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-4">
          <SelectField
            label={t.gradeConverter.toScaleLabel}
            value={toScale}
            onChange={(value) => setToScale(value as GradeScaleId)}
            options={GRADE_SCALES.map((s) => ({ id: s.id, label: s.label }))}
          />
          <div
            id={resultRegionId}
            aria-live="polite"
            className="rounded-md border border-ink-200 bg-ink-50 px-3 py-2"
          >
            <p className="text-sm font-medium text-ink-600">{t.common.result}</p>
            <p className="mt-0.5 break-words text-lg font-semibold text-ink-950">
              {convertedValue !== null
                ? `${formatGrade(convertedValue)} ${toScaleDefinition.symbol}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {t.gradeConverter.disclaimer}
      </p>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.gradeConverter.howItWorks}</p>
      </div>
    </div>
  )
}

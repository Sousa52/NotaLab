import { useId, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { parseLocaleNumber } from '../../../lib/validation'
import {
  UNIT_CATEGORIES,
  convert,
  formatConvertedValue,
  getDefaultUnits,
  getUnitsForCategory,
  type UnitCategoryId,
  type UnitOption,
} from './calculate'

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
}

/** Mirrors Field's visual language for a native <select>; kept local since only this tool needs it. */
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

function findUnit(units: UnitOption[], id: string): UnitOption | undefined {
  return units.find((unit) => unit.id === id)
}

export function UnitConverterTool() {
  const t = useI18n()
  const [category, setCategory] = useState<UnitCategoryId>('length')
  const [fromUnit, setFromUnit] = useState(() => getDefaultUnits('length').from)
  const [toUnit, setToUnit] = useState(() => getDefaultUnits('length').to)
  const [rawValue, setRawValue] = useState('1')
  const resultRegionId = useId()

  const units = getUnitsForCategory(category)

  function handleCategoryChange(next: UnitCategoryId) {
    setCategory(next)
    const nextDefaults = getDefaultUnits(next)
    setFromUnit(nextDefaults.from)
    setToUnit(nextDefaults.to)
  }

  function handleSwap() {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }

  const parsedValue = parseLocaleNumber(rawValue)
  const hasError = rawValue.trim() !== '' && parsedValue === null

  const convertedValue =
    parsedValue !== null && !hasError ? convert(parsedValue, category, fromUnit, toUnit) : null
  const toSymbol = findUnit(units, toUnit)?.symbol ?? ''

  return (
    <div className="space-y-6">
      <SelectField
        label={t.unitConverter.categoryLabel}
        value={category}
        onChange={(value) => handleCategoryChange(value as UnitCategoryId)}
        options={UNIT_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div className="space-y-4">
          <SelectField label={t.unitConverter.fromUnitLabel} value={fromUnit} onChange={setFromUnit} options={units} />
          <Field
            label={t.unitConverter.valueLabel}
            inputMode="decimal"
            placeholder="1"
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            error={hasError ? t.unitConverter.invalidValue : undefined}
          />
        </div>

        <div className="flex justify-center pb-2.5 sm:pb-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSwap}
            aria-label={t.unitConverter.swapLabel}
            className="rounded-full"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-4">
          <SelectField label={t.unitConverter.toUnitLabel} value={toUnit} onChange={setToUnit} options={units} />
          <div
            id={resultRegionId}
            aria-live="polite"
            className="rounded-md border border-ink-200 bg-ink-50 px-3 py-2"
          >
            <p className="text-sm font-medium text-ink-600">{t.common.result}</p>
            <p className="mt-0.5 break-words text-lg font-semibold text-ink-950">
              {convertedValue !== null ? `${formatConvertedValue(convertedValue)} ${toSymbol}` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.unitConverter.howItWorks}</p>
      </div>
    </div>
  )
}

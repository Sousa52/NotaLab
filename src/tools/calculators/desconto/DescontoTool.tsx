import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import {
  calculateDiscount,
  calculateDiscountPercentage,
  type DiscountAmountResult,
  type DiscountPercentageResult,
} from './calculate'

type ModeId = 'discount' | 'percentage'

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

export function DescontoTool() {
  const t = useI18n()
  const s = t.discountCalculator
  const [mode, setMode] = useState<ModeId>('discount')
  const [originalRaw, setOriginalRaw] = useState('')
  const [secondRaw, setSecondRaw] = useState('')

  function handleModeChange(nextMode: ModeId) {
    setMode(nextMode)
    // The second field means something different in each mode (percentage vs. final price),
    // so it is cleared; the original price carries over.
    setSecondRaw('')
  }

  function handleReset() {
    setOriginalRaw('')
    setSecondRaw('')
  }

  const parsedOriginal = parseLocaleNumber(originalRaw)
  const parsedSecond = parseLocaleNumber(secondRaw)

  const originalError = originalRaw.trim() !== '' && parsedOriginal === null ? s.invalidValue : undefined
  const secondError = secondRaw.trim() !== '' && parsedSecond === null ? s.invalidValue : undefined

  // Null checks stay inline in this single condition so TypeScript can narrow
  // parsedOriginal/parsedSecond to `number` for both branches below.
  let result: DiscountAmountResult | DiscountPercentageResult | null = null
  if (parsedOriginal !== null && parsedSecond !== null && !originalError && !secondError) {
    result =
      mode === 'discount'
        ? calculateDiscount(parsedOriginal, parsedSecond)
        : calculateDiscountPercentage(parsedOriginal, parsedSecond)
  }

  return (
    <div className="space-y-6">
      <SelectField
        label={s.modeLabel}
        value={mode}
        onChange={(value) => handleModeChange(value as ModeId)}
        options={[
          { id: 'discount', label: s.modeDiscount },
          { id: 'percentage', label: s.modePercentage },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={s.originalPriceLabel}
          inputMode="decimal"
          placeholder="100"
          value={originalRaw}
          onChange={(e) => setOriginalRaw(e.target.value)}
          error={originalError}
          suffix="€"
        />
        {mode === 'discount' ? (
          <Field
            label={s.discountPercentLabel}
            inputMode="decimal"
            placeholder="20"
            value={secondRaw}
            onChange={(e) => setSecondRaw(e.target.value)}
            error={secondError}
            suffix="%"
          />
        ) : (
          <Field
            label={s.finalPriceLabel}
            inputMode="decimal"
            placeholder="80"
            value={secondRaw}
            onChange={(e) => setSecondRaw(e.target.value)}
            error={secondError}
            suffix="€"
          />
        )}
      </div>

      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t.common.clear}
      </Button>

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {result === null && <p className="text-sm text-ink-600">{s.emptyState}</p>}

        {result?.status === 'error' && (
          <p className="text-sm font-medium text-red-700">{s.errors[result.code]}</p>
        )}

        {result?.status === 'ok' && 'discountPercent' in result && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-ink-600">{s.discountPercentLabel}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-950">{formatGrade(result.discountPercent)}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600">{s.discountAmountLabel}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-950">{formatGrade(result.discountAmount)} €</p>
            </div>
          </div>
        )}

        {result?.status === 'ok' && !('discountPercent' in result) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-ink-600">{s.discountAmountLabel}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-950">{formatGrade(result.discountAmount)} €</p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600">{s.finalPriceLabel}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-950">{formatGrade(result.finalPrice)} €</p>
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

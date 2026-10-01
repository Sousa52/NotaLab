import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import { VAT_RATES, addVat, removeVat, type VatRateId, type VatResult } from './calculate'

type ModeId = 'add' | 'remove'

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
}

/** Mirrors Field's visual language for a native <select>; kept local like in the other calculators. */
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

export function VatCalculatorTool() {
  const t = useI18n()
  const s = t.vatCalculator
  const [mode, setMode] = useState<ModeId>('add')
  const [rateId, setRateId] = useState<VatRateId>('normal')
  const [amountRaw, setAmountRaw] = useState('')
  const [customRaw, setCustomRaw] = useState('')

  function handleReset() {
    setAmountRaw('')
    setCustomRaw('')
  }

  const parsedAmount = parseLocaleNumber(amountRaw)
  const parsedCustom = parseLocaleNumber(customRaw)

  const amountError = amountRaw.trim() !== '' && parsedAmount === null ? s.invalidValue : undefined
  const customError =
    rateId === 'custom' && customRaw.trim() !== '' && parsedCustom === null ? s.invalidValue : undefined

  const rate = rateId === 'custom' ? parsedCustom : VAT_RATES[rateId]

  // Null checks stay inline in this single condition so TypeScript can narrow
  // parsedAmount/rate to `number` for the calls below.
  let result: VatResult | null = null
  if (parsedAmount !== null && rate !== null && !amountError && !customError) {
    result = mode === 'add' ? addVat(parsedAmount, rate) : removeVat(parsedAmount, rate)
  }

  return (
    <div className="space-y-6">
      <SelectField
        label={s.modeLabel}
        value={mode}
        onChange={(value) => setMode(value as ModeId)}
        options={[
          { id: 'add', label: s.modeAdd },
          { id: 'remove', label: s.modeRemove },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={mode === 'add' ? s.netLabel : s.grossLabel}
          inputMode="decimal"
          placeholder={s.amountPlaceholder}
          value={amountRaw}
          onChange={(e) => setAmountRaw(e.target.value)}
          error={amountError}
          suffix="€"
        />
        <SelectField
          label={s.rateLabel}
          value={rateId}
          onChange={(value) => setRateId(value as VatRateId)}
          options={[
            { id: 'reduced', label: s.rateOption(VAT_RATES.reduced, s.rateReducedName) },
            { id: 'intermediate', label: s.rateOption(VAT_RATES.intermediate, s.rateIntermediateName) },
            { id: 'normal', label: s.rateOption(VAT_RATES.normal, s.rateNormalName) },
            { id: 'custom', label: s.rateCustom },
          ]}
        />
        {rateId === 'custom' && (
          <div className="sm:col-start-2">
            <Field
              label={s.customRateLabel}
              inputMode="decimal"
              placeholder={s.customRatePlaceholder}
              value={customRaw}
              onChange={(e) => setCustomRaw(e.target.value)}
              error={customError}
              suffix="%"
            />
          </div>
        )}
      </div>

      <p className="text-sm text-ink-600">{s.rateNotice}</p>

      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t.common.clear}
      </Button>

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {result === null && <p className="text-sm text-ink-600">{s.emptyState}</p>}

        {result?.status === 'error' && (
          <p className="text-sm font-medium text-red-700">{s.errors[result.code]}</p>
        )}

        {result?.status === 'ok' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-ink-600">{mode === 'add' ? s.vatLabel : s.netLabel}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-950">
                {formatGrade(mode === 'add' ? result.vatAmount : result.netAmount)} €
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600">{mode === 'add' ? s.totalLabel : s.vatIncludedLabel}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-950">
                {formatGrade(mode === 'add' ? result.grossAmount : result.vatAmount)} €
              </p>
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

import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import { calculateCompoundInterest, calculateSimpleInterest } from './calculate'

type ModeId = 'simple' | 'compound'

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

export function InterestCalculatorTool() {
  const t = useI18n()
  const [mode, setMode] = useState<ModeId>('simple')
  const [capitalRaw, setCapitalRaw] = useState('')
  const [rateRaw, setRateRaw] = useState('')
  const [periodsRaw, setPeriodsRaw] = useState('')

  function handleReset() {
    setCapitalRaw('')
    setRateRaw('')
    setPeriodsRaw('')
  }

  const parsedCapital = parseLocaleNumber(capitalRaw)
  const parsedRate = parseLocaleNumber(rateRaw)
  const parsedPeriods = parseLocaleNumber(periodsRaw)

  const capitalError =
    capitalRaw.trim() !== '' && parsedCapital === null ? t.interestCalculator.invalidValue : undefined
  const rateError = rateRaw.trim() !== '' && parsedRate === null ? t.interestCalculator.invalidValue : undefined
  const periodsError =
    periodsRaw.trim() !== '' && parsedPeriods === null ? t.interestCalculator.invalidValue : undefined

  // Null checks stay inline in this single condition so TypeScript can narrow
  // parsedCapital/parsedRate/parsedPeriods to `number` for both branches below —
  // splitting this into a separate boolean variable would lose that narrowing.
  const result =
    parsedCapital !== null && parsedRate !== null && parsedPeriods !== null && !capitalError && !rateError && !periodsError
      ? mode === 'simple'
        ? calculateSimpleInterest(parsedCapital, parsedRate, parsedPeriods)
        : calculateCompoundInterest(parsedCapital, parsedRate, parsedPeriods)
      : null

  return (
    <div className="space-y-6">
      <SelectField
        label={t.interestCalculator.modeLabel}
        value={mode}
        onChange={(value) => setMode(value as ModeId)}
        options={[
          { id: 'simple', label: t.interestCalculator.modeSimple },
          { id: 'compound', label: t.interestCalculator.modeCompound },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t.interestCalculator.capitalLabel}
          inputMode="decimal"
          placeholder="1000"
          value={capitalRaw}
          onChange={(e) => setCapitalRaw(e.target.value)}
          error={capitalError}
          suffix="€"
        />
        <Field
          label={t.interestCalculator.rateLabel}
          inputMode="decimal"
          placeholder="5"
          value={rateRaw}
          onChange={(e) => setRateRaw(e.target.value)}
          error={rateError}
          suffix="%"
        />
        <Field
          label={t.interestCalculator.periodsLabel}
          inputMode="decimal"
          placeholder="10"
          value={periodsRaw}
          onChange={(e) => setPeriodsRaw(e.target.value)}
          error={periodsError}
          hint={t.interestCalculator.periodsHint}
        />
      </div>

      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t.common.clear}
      </Button>

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {result === null && <p className="text-sm text-ink-600">{t.interestCalculator.emptyState}</p>}

        {result?.status === 'error' && <p className="text-sm font-medium text-red-700">{result.message}</p>}

        {result?.status === 'ok' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-ink-600">{t.interestCalculator.interestLabel}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-950">{formatGrade(result.interest)} €</p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-600">{t.interestCalculator.amountLabel}</p>
              <p className="mt-0.5 text-2xl font-semibold text-ink-950">{formatGrade(result.amount)} €</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.interestCalculator.howItWorks}</p>
      </div>
    </div>
  )
}

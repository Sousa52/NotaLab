import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import {
  DEFAULT_SOCIAL_SECURITY_RATE,
  PAYMENTS_PER_YEAR_OPTIONS,
  calculateSalary,
  type PaymentsPerYear,
  type SalaryResult,
} from './calculate'

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

interface AmountRowProps {
  label: string
  value: string
}

function AmountRow({ label, value }: AmountRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className="text-base font-semibold text-ink-950">{value}</dd>
    </div>
  )
}

export function SalaryCalculatorTool() {
  const t = useI18n()
  const s = t.salaryCalculator
  const [grossRaw, setGrossRaw] = useState('')
  const [payments, setPayments] = useState<PaymentsPerYear>(14)
  const [irsRaw, setIrsRaw] = useState('')
  const [ssRaw, setSsRaw] = useState(String(DEFAULT_SOCIAL_SECURITY_RATE))

  function handleReset() {
    setGrossRaw('')
    setIrsRaw('')
    setSsRaw(String(DEFAULT_SOCIAL_SECURITY_RATE))
  }

  const parsedGross = parseLocaleNumber(grossRaw)
  const parsedIrs = parseLocaleNumber(irsRaw)
  const parsedSs = parseLocaleNumber(ssRaw)

  const grossError = grossRaw.trim() !== '' && parsedGross === null ? s.invalidValue : undefined
  const irsError = irsRaw.trim() !== '' && parsedIrs === null ? s.invalidValue : undefined
  const ssError = ssRaw.trim() !== '' && parsedSs === null ? s.invalidValue : undefined

  // Null checks stay inline in this single condition so TypeScript can narrow the parsed
  // values to `number` for the call below.
  let result: SalaryResult | null = null
  if (
    parsedGross !== null &&
    parsedIrs !== null &&
    parsedSs !== null &&
    !grossError &&
    !irsError &&
    !ssError
  ) {
    result = calculateSalary({
      grossMonthly: parsedGross,
      paymentsPerYear: payments,
      irsRatePercent: parsedIrs,
      socialSecurityRatePercent: parsedSs,
    })
  }

  const euro = (value: number) => `${formatGrade(value)} €`

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={s.grossLabel}
          inputMode="decimal"
          placeholder={s.grossPlaceholder}
          value={grossRaw}
          onChange={(e) => setGrossRaw(e.target.value)}
          error={grossError}
          suffix="€"
        />
        <SelectField
          label={s.paymentsLabel}
          value={String(payments)}
          onChange={(value) => setPayments(Number(value) as PaymentsPerYear)}
          options={PAYMENTS_PER_YEAR_OPTIONS.map((n) => ({ id: String(n), label: s.paymentsOption(n) }))}
        />
        <Field
          label={s.irsLabel}
          inputMode="decimal"
          placeholder={s.irsPlaceholder}
          hint={s.irsHint}
          value={irsRaw}
          onChange={(e) => setIrsRaw(e.target.value)}
          error={irsError}
          suffix="%"
        />
        <Field
          label={s.ssLabel}
          inputMode="decimal"
          placeholder={s.ssPlaceholder}
          hint={s.ssHint}
          value={ssRaw}
          onChange={(e) => setSsRaw(e.target.value)}
          error={ssError}
          suffix="%"
        />
      </div>

      <div className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-700">
        <p className="font-medium text-ink-900">{s.noticeTitle}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {s.noticeItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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

        {result?.status === 'ok' && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-ink-600">{s.netMonthlyLabel}</p>
              <p className="mt-1 text-4xl font-semibold text-ink-950">{euro(result.netMonthly)}</p>
            </div>

            <div className="border-t border-ink-200 pt-4">
              <p className="text-sm font-medium text-ink-800">{s.deductionsTitle}</p>
              <dl className="mt-2 space-y-1.5">
                <AmountRow label={s.ssAmountLabel} value={euro(result.socialSecurityAmount)} />
                <AmountRow label={s.irsAmountLabel} value={euro(result.irsAmount)} />
                <AmountRow label={s.totalDeductionsLabel} value={euro(result.totalDeductions)} />
              </dl>
            </div>

            <div className="border-t border-ink-200 pt-4">
              <p className="text-sm font-medium text-ink-800">{s.annualTitle}</p>
              <dl className="mt-2 space-y-1.5">
                <AmountRow label={s.grossAnnualLabel} value={euro(result.grossAnnual)} />
                <AmountRow label={s.netAnnualLabel} value={euro(result.netAnnual)} />
              </dl>
              <p className="mt-2 text-xs text-ink-600">{s.annualNote(payments)}</p>
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

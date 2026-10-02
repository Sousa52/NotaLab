import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import { calculateLoan, type LoanResult, type LoanTermUnit } from './calculate'

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

interface StatProps {
  label: string
  value: string
  note?: string
}

function Stat({ label, value, note }: StatProps) {
  return (
    <div>
      <dt className="text-sm font-medium text-ink-600">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold text-ink-950">{value}</dd>
      {note && <dd className="mt-0.5 text-xs text-ink-600">{note}</dd>}
    </div>
  )
}

export function LoanRepaymentTool() {
  const t = useI18n()
  const s = t.loanRepayment
  const [loanRaw, setLoanRaw] = useState('')
  const [rateRaw, setRateRaw] = useState('')
  const [termRaw, setTermRaw] = useState('')
  const [termUnit, setTermUnit] = useState<LoanTermUnit>('years')
  const [downRaw, setDownRaw] = useState('')
  const [extraRaw, setExtraRaw] = useState('')

  function handleReset() {
    setLoanRaw('')
    setRateRaw('')
    setTermRaw('')
    setDownRaw('')
    setExtraRaw('')
  }

  const parsedLoan = parseLocaleNumber(loanRaw)
  const parsedRate = parseLocaleNumber(rateRaw)
  const parsedTerm = parseLocaleNumber(termRaw)
  // The down payment and the additional repayment are optional: blank means none.
  const downIsBlank = downRaw.trim() === ''
  const extraIsBlank = extraRaw.trim() === ''
  const parsedDown = downIsBlank ? 0 : parseLocaleNumber(downRaw)
  const parsedExtra = extraIsBlank ? 0 : parseLocaleNumber(extraRaw)

  const loanError = loanRaw.trim() !== '' && parsedLoan === null ? s.invalidValue : undefined
  const rateError = rateRaw.trim() !== '' && parsedRate === null ? s.invalidValue : undefined
  const termError = termRaw.trim() !== '' && parsedTerm === null ? s.invalidValue : undefined
  const downError = !downIsBlank && parsedDown === null ? s.invalidValue : undefined
  const extraError = !extraIsBlank && parsedExtra === null ? s.invalidValue : undefined

  // Null checks stay inline in this single condition so TypeScript can narrow the parsed
  // values to `number` for the call below.
  let result: LoanResult | null = null
  if (
    parsedLoan !== null &&
    parsedRate !== null &&
    parsedTerm !== null &&
    parsedDown !== null &&
    parsedExtra !== null &&
    !loanError &&
    !rateError &&
    !termError &&
    !downError &&
    !extraError
  ) {
    result = calculateLoan({
      loanAmount: parsedLoan,
      annualRatePercent: parsedRate,
      term: parsedTerm,
      termUnit,
      downPayment: parsedDown,
      extraMonthlyPayment: parsedExtra,
    })
  }

  const euro = (value: number) => `${formatGrade(value)} €`

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={s.loanAmountLabel}
          inputMode="decimal"
          placeholder={s.loanAmountPlaceholder}
          hint={s.loanAmountHint}
          value={loanRaw}
          onChange={(e) => setLoanRaw(e.target.value)}
          error={loanError}
          suffix="€"
        />
        <Field
          label={s.rateLabel}
          inputMode="decimal"
          placeholder={s.ratePlaceholder}
          hint={s.rateHint}
          value={rateRaw}
          onChange={(e) => setRateRaw(e.target.value)}
          error={rateError}
          suffix="%"
        />
        <Field
          label={s.termLabel}
          inputMode="decimal"
          placeholder={s.termPlaceholder}
          hint={s.termHint}
          value={termRaw}
          onChange={(e) => setTermRaw(e.target.value)}
          error={termError}
        />
        <SelectField
          label={s.termUnitLabel}
          value={termUnit}
          onChange={(value) => setTermUnit(value as LoanTermUnit)}
          options={[
            { id: 'years', label: s.termUnitYears },
            { id: 'months', label: s.termUnitMonths },
          ]}
        />
        <Field
          label={s.downPaymentLabel}
          inputMode="decimal"
          placeholder={s.downPaymentPlaceholder}
          hint={s.downPaymentHint}
          value={downRaw}
          onChange={(e) => setDownRaw(e.target.value)}
          error={downError}
          suffix="€"
        />
        <Field
          label={s.extraLabel}
          inputMode="decimal"
          placeholder={s.extraPlaceholder}
          hint={s.extraHint}
          value={extraRaw}
          onChange={(e) => setExtraRaw(e.target.value)}
          error={extraError}
          suffix="€"
        />
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-ink-600">{s.instalmentLabel}</p>
                <p className="mt-1 text-4xl font-semibold text-ink-950">{euro(result.monthlyInstalment)}</p>
                <p className="mt-1 text-xs text-ink-600">{s.instalmentNote}</p>
              </div>
              {result.hasExtra && (
                <div>
                  <p className="text-sm font-medium text-ink-600">{s.paymentWithExtraLabel}</p>
                  <p className="mt-1 text-4xl font-semibold text-ink-950">{euro(result.monthlyPaymentWithExtra)}</p>
                  <p className="mt-1 text-xs text-ink-600">{s.paymentWithExtraNote}</p>
                </div>
              )}
            </div>

            <dl className="grid gap-4 border-t border-ink-200 pt-4 sm:grid-cols-3">
              {result.downPayment > 0 && <Stat label={s.financedLabel} value={euro(result.financedAmount)} />}
              <Stat label={s.totalInterestLabel} value={euro(result.totalInterest)} />
              <Stat label={s.totalRepaidLabel} value={euro(result.totalRepaid)} note={s.totalRepaidNote} />
            </dl>

            {result.hasExtra && (
              <div className="border-t border-ink-200 pt-4">
                <p className="text-sm font-medium text-ink-800">{s.extraSectionTitle}</p>
                <dl className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Stat label={s.payoffLabel} value={s.duration(result.payoffMonths)} />
                  <Stat label={s.monthsSavedLabel} value={s.duration(result.monthsSaved)} />
                  <Stat label={s.interestSavedLabel} value={euro(result.interestSaved)} />
                </dl>
                <p className="mt-3 text-xs text-ink-600">
                  {s.baselineSummary(euro(result.baselineTotalInterest), s.duration(result.termMonths))}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {result?.status === 'ok' && (
        <details className="rounded-lg border border-ink-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-800">
            {s.tableToggle(result.schedule.length)}
          </summary>
          <div className="max-h-96 overflow-auto border-t border-ink-200">
            <table className="w-full text-sm tabular-nums">
              <thead className="sticky top-0 bg-white text-ink-600">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {s.tableMonth}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {s.tableStart}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {s.tablePrincipal}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {s.tableInterest}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {s.tableAdditional}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {s.tableEnd}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((row) => (
                  <tr key={row.month} className="border-t border-ink-200">
                    <th scope="row" className="px-4 py-2 text-left font-medium text-ink-800">
                      {row.month}
                    </th>
                    <td className="px-4 py-2 text-right text-ink-700">{euro(row.startBalance)}</td>
                    <td className="px-4 py-2 text-right text-ink-700">{euro(row.principal)}</td>
                    <td className="px-4 py-2 text-right text-ink-700">{euro(row.interest)}</td>
                    <td className="px-4 py-2 text-right text-ink-700">{euro(row.additional)}</td>
                    <td className="px-4 py-2 text-right font-medium text-ink-950">{euro(row.endBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <p className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-700">{s.disclaimer}</p>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">{s.howItWorksTitle}</h2>
        <p className="mt-2">{s.howItWorks}</p>
      </div>
    </div>
  )
}

import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import { calculateDirectProportion, calculateInverseProportion } from './calculate'

type ModeId = 'direct' | 'inverse'

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

export function RuleOfThreeTool() {
  const t = useI18n()
  const [mode, setMode] = useState<ModeId>('direct')
  const [aRaw, setARaw] = useState('')
  const [bRaw, setBRaw] = useState('')
  const [cRaw, setCRaw] = useState('')

  function handleReset() {
    setARaw('')
    setBRaw('')
    setCRaw('')
  }

  const parsedA = parseLocaleNumber(aRaw)
  const parsedB = parseLocaleNumber(bRaw)
  const parsedC = parseLocaleNumber(cRaw)

  const aError = aRaw.trim() !== '' && parsedA === null ? t.ruleOfThree.invalidValue : undefined
  const bError = bRaw.trim() !== '' && parsedB === null ? t.ruleOfThree.invalidValue : undefined
  const cError = cRaw.trim() !== '' && parsedC === null ? t.ruleOfThree.invalidValue : undefined

  // Null checks stay inline in this single condition so TypeScript can narrow
  // parsedA/parsedB/parsedC to `number` for both branches below — splitting this
  // into a separate boolean variable would lose that narrowing.
  const result =
    parsedA !== null && parsedB !== null && parsedC !== null && !aError && !bError && !cError
      ? mode === 'direct'
        ? calculateDirectProportion(parsedA, parsedB, parsedC)
        : calculateInverseProportion(parsedA, parsedB, parsedC)
      : null

  const formula = mode === 'direct' ? t.ruleOfThree.formulaDirect : t.ruleOfThree.formulaInverse

  return (
    <div className="space-y-6">
      <SelectField
        label={t.ruleOfThree.modeLabel}
        value={mode}
        onChange={(value) => setMode(value as ModeId)}
        options={[
          { id: 'direct', label: t.ruleOfThree.modeDirect },
          { id: 'inverse', label: t.ruleOfThree.modeInverse },
        ]}
      />

      <p className="rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm font-medium text-ink-800">
        {formula}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t.ruleOfThree.aLabel}
          inputMode="decimal"
          placeholder="2"
          value={aRaw}
          onChange={(e) => setARaw(e.target.value)}
          error={aError}
        />
        <Field
          label={t.ruleOfThree.bLabel}
          inputMode="decimal"
          placeholder="6"
          value={bRaw}
          onChange={(e) => setBRaw(e.target.value)}
          error={bError}
        />
        <Field
          label={t.ruleOfThree.cLabel}
          inputMode="decimal"
          placeholder="5"
          value={cRaw}
          onChange={(e) => setCRaw(e.target.value)}
          error={cError}
        />
      </div>

      <Button type="button" variant="ghost" onClick={handleReset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t.common.clear}
      </Button>

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {result === null && <p className="text-sm text-ink-600">{t.ruleOfThree.emptyState}</p>}

        {result?.status === 'error' && <p className="text-sm font-medium text-red-700">{result.message}</p>}

        {result?.status === 'ok' && (
          <>
            <p className="text-sm font-medium text-ink-600">{t.ruleOfThree.resultLabel}</p>
            <p className="mt-0.5 text-3xl font-semibold text-ink-950">{formatGrade(result.value)}</p>
          </>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.ruleOfThree.howItWorks}</p>
      </div>
    </div>
  )
}

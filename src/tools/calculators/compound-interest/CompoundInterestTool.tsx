import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { parseLocaleNumber } from '../../../lib/validation'
import {
  calculateCompoundGrowth,
  type CompoundInterestResult,
  type CompoundingFrequency,
  type ContributionFrequency,
  type GrowthPoint,
} from './calculate'

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
  hint?: string
}

/** Mirrors Field's visual language for a native <select>; kept local like in the other calculators. */
function SelectField({ label, value, onChange, options, hint }: SelectFieldProps) {
  const selectId = useId()
  const hintId = hint ? `${selectId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-ink-800">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hintId}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="text-xs text-ink-600">
          {hint}
        </p>
      )}
    </div>
  )
}

// --- Growth chart (native SVG, no chart dependency) ---------------------------------

const CHART_WIDTH = 640
const CHART_HEIGHT = 280
const CHART_MARGIN = { top: 12, right: 16, bottom: 32, left: 64 }

/** Rounds a positive value up to a "nice" axis maximum (1, 2, 5 or 10 × a power of ten). */
function niceCeil(value: number): number {
  if (!(value > 0)) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function formatAxisValue(value: number): string {
  return value.toLocaleString('pt-PT', { notation: 'compact', maximumFractionDigits: 1 })
}

interface GrowthChartProps {
  schedule: GrowthPoint[]
  ariaLabel: string
  balanceLabel: string
  investedLabel: string
  yearsLabel: string
}

function GrowthChart({ schedule, ariaLabel, balanceLabel, investedLabel, yearsLabel }: GrowthChartProps) {
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom
  const baseline = CHART_MARGIN.top + plotHeight

  const lastYear = schedule.reduce((max, point) => Math.max(max, point.year), 0)
  const yMax = niceCeil(schedule.reduce((max, point) => Math.max(max, point.balance), 0))

  const x = (year: number) => CHART_MARGIN.left + (lastYear === 0 ? 0 : year / lastYear) * plotWidth
  const y = (value: number) => CHART_MARGIN.top + (1 - value / yMax) * plotHeight

  const linePath = (pick: (point: GrowthPoint) => number) =>
    schedule
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.year).toFixed(1)} ${y(pick(point)).toFixed(1)}`)
      .join(' ')

  const balancePath = linePath((point) => point.balance)
  const investedPath = linePath((point) => point.invested)
  const areaPath = `${balancePath} L${x(lastYear).toFixed(1)} ${baseline} L${x(0).toFixed(1)} ${baseline} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * yMax)

  // About five labelled years; the last year is always labelled.
  const yearStep = Math.max(1, Math.ceil(lastYear / 5))
  const xTicks: number[] = []
  for (let year = 0; year <= lastYear; year += yearStep) xTicks.push(year)
  const lastTick = Math.max(...xTicks)
  if (lastTick !== lastYear) {
    if (lastYear - lastTick < yearStep / 2) xTicks[xTicks.length - 1] = lastYear
    else xTicks.push(lastYear)
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full"
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={CHART_MARGIN.left}
              x2={CHART_WIDTH - CHART_MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-ink-200"
              strokeWidth={1}
            />
            <text
              x={CHART_MARGIN.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              className="fill-ink-600"
            >
              {formatAxisValue(tick)}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <text
            key={tick}
            x={x(tick)}
            y={baseline + 18}
            textAnchor="middle"
            fontSize={11}
            className="fill-ink-600"
          >
            {tick}
          </text>
        ))}
        <text
          x={CHART_MARGIN.left + plotWidth / 2}
          y={CHART_HEIGHT - 2}
          textAnchor="middle"
          fontSize={11}
          className="fill-ink-600"
        >
          {yearsLabel}
        </text>

        <path d={areaPath} className="fill-brand-600/10" stroke="none" />
        <path
          d={investedPath}
          fill="none"
          className="stroke-ink-400"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        <path d={balancePath} fill="none" className="stroke-brand-600" strokeWidth={2.5} strokeLinejoin="round" />
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-700">
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-brand-600" aria-hidden="true" />
          {balanceLabel}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-ink-400" aria-hidden="true" />
          {investedLabel}
        </li>
      </ul>
    </div>
  )
}

// --- Tool ----------------------------------------------------------------------------

export function CompoundInterestTool() {
  const t = useI18n()
  const s = t.compoundInterest
  const [initialRaw, setInitialRaw] = useState('')
  const [contributionRaw, setContributionRaw] = useState('')
  const [rateRaw, setRateRaw] = useState('')
  const [yearsRaw, setYearsRaw] = useState('')
  const [contributionFrequency, setContributionFrequency] = useState<ContributionFrequency>('monthly')
  const [compounding, setCompounding] = useState<CompoundingFrequency>('monthly')

  function handleReset() {
    setInitialRaw('')
    setContributionRaw('')
    setRateRaw('')
    setYearsRaw('')
  }

  const parsedInitial = parseLocaleNumber(initialRaw)
  // The contribution is optional: leaving it blank means no regular contributions.
  const contributionIsBlank = contributionRaw.trim() === ''
  const parsedContribution = contributionIsBlank ? 0 : parseLocaleNumber(contributionRaw)
  const parsedRate = parseLocaleNumber(rateRaw)
  const parsedYears = parseLocaleNumber(yearsRaw)

  const initialError = initialRaw.trim() !== '' && parsedInitial === null ? s.invalidValue : undefined
  const contributionError = !contributionIsBlank && parsedContribution === null ? s.invalidValue : undefined
  const rateError = rateRaw.trim() !== '' && parsedRate === null ? s.invalidValue : undefined
  const yearsError = yearsRaw.trim() !== '' && parsedYears === null ? s.invalidValue : undefined

  // Null checks stay inline in this single condition so TypeScript can narrow the parsed
  // values to `number` for the call below.
  let result: CompoundInterestResult | null = null
  if (
    parsedInitial !== null &&
    parsedContribution !== null &&
    parsedRate !== null &&
    parsedYears !== null &&
    !initialError &&
    !contributionError &&
    !rateError &&
    !yearsError
  ) {
    result = calculateCompoundGrowth({
      initialInvestment: parsedInitial,
      contribution: parsedContribution,
      contributionFrequency,
      annualRatePercent: parsedRate,
      years: parsedYears,
      compounding,
    })
  }

  const euro = (value: number) => `${formatGrade(value)} €`
  const percent = (value: number) => `${formatGrade(value)}%`

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={s.initialLabel}
          inputMode="decimal"
          placeholder={s.initialPlaceholder}
          hint={s.initialHint}
          value={initialRaw}
          onChange={(e) => setInitialRaw(e.target.value)}
          error={initialError}
          suffix="€"
        />
        <Field
          label={s.yearsLabel}
          inputMode="decimal"
          placeholder={s.yearsPlaceholder}
          hint={s.yearsHint}
          value={yearsRaw}
          onChange={(e) => setYearsRaw(e.target.value)}
          error={yearsError}
        />
        <Field
          label={s.contributionLabel}
          inputMode="decimal"
          placeholder={s.contributionPlaceholder}
          hint={s.contributionHint}
          value={contributionRaw}
          onChange={(e) => setContributionRaw(e.target.value)}
          error={contributionError}
          suffix="€"
        />
        <SelectField
          label={s.contributionFrequencyLabel}
          hint={s.contributionFrequencyHint}
          value={contributionFrequency}
          onChange={(value) => setContributionFrequency(value as ContributionFrequency)}
          options={[
            { id: 'monthly', label: s.contributionMonthly },
            { id: 'yearly', label: s.contributionYearly },
          ]}
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
        <SelectField
          label={s.compoundingLabel}
          hint={s.compoundingHint}
          value={compounding}
          onChange={(value) => setCompounding(value as CompoundingFrequency)}
          options={[
            { id: 'monthly', label: s.compoundingMonthly },
            { id: 'quarterly', label: s.compoundingQuarterly },
            { id: 'semiannual', label: s.compoundingSemiannual },
            { id: 'annual', label: s.compoundingAnnual },
          ]}
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
            <div>
              <p className="text-sm font-medium text-ink-600">{s.finalLabel}</p>
              <p className="mt-1 text-4xl font-semibold text-ink-950">{euro(result.finalBalance)}</p>
            </div>

            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-ink-600">{s.investedLabel}</dt>
                <dd className="mt-0.5 text-xl font-semibold text-ink-950">{euro(result.totalInvested)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink-600">{s.interestLabel}</dt>
                <dd className="mt-0.5 text-xl font-semibold text-ink-950">{euro(result.totalInterest)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-ink-600">{s.effectiveRateLabel}</dt>
                <dd className="mt-0.5 text-xl font-semibold text-ink-950">
                  {percent(result.effectiveAnnualRatePercent)}
                </dd>
              </div>
            </dl>

            {result.finalBalance > 0 && (
              <div>
                <p className="text-sm font-medium text-ink-800">{s.breakdownTitle}</p>
                <div
                  role="img"
                  aria-label={s.breakdownAria(percent(result.principalPercent), percent(result.interestPercent))}
                  className="mt-2 flex h-3 overflow-hidden rounded-full bg-ink-200"
                >
                  <div className="bg-ink-400" style={{ width: `${result.principalPercent}%` }} />
                  <div className="bg-brand-600" style={{ width: `${result.interestPercent}%` }} />
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-700">
                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-ink-400" aria-hidden="true" />
                    {s.principalLegend}: {euro(result.totalInvested)} ({percent(result.principalPercent)})
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-600" aria-hidden="true" />
                    {s.interestLegend}: {euro(result.totalInterest)} ({percent(result.interestPercent)})
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {result?.status === 'ok' && (
        <div className="space-y-4 rounded-lg border border-ink-200 p-6">
          <p className="text-sm font-medium text-ink-800">{s.chartTitle}</p>
          <GrowthChart
            schedule={result.schedule}
            ariaLabel={s.chartAria(result.schedule.length - 1, euro(result.finalBalance))}
            balanceLabel={s.seriesBalance}
            investedLabel={s.seriesInvested}
            yearsLabel={s.axisYears}
          />

          <details className="rounded-md border border-ink-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-800">{s.tableToggle}</summary>
            <div className="max-h-96 overflow-auto border-t border-ink-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-ink-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left font-medium">
                      {s.tableYear}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {s.tableInvested}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {s.tableInterest}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {s.tableBalance}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((point) => (
                    <tr key={point.year} className="border-t border-ink-200">
                      <th scope="row" className="px-4 py-2 text-left font-medium text-ink-800">
                        {point.year}
                      </th>
                      <td className="px-4 py-2 text-right text-ink-700">{euro(point.invested)}</td>
                      <td className="px-4 py-2 text-right text-ink-700">{euro(point.interest)}</td>
                      <td className="px-4 py-2 text-right font-medium text-ink-950">{euro(point.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <p className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-700">{s.disclaimer}</p>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">{s.howItWorksTitle}</h2>
        <p className="mt-2">{s.howItWorks}</p>
      </div>
    </div>
  )
}

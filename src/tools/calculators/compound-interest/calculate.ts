// Pure compound-growth projection — no React, no DOM, no eval/Function. Every function
// returns a typed result instead of throwing, matching the pattern used across NotaLab's
// other calculators.
//
// Errors carry a stable `code` (which the UI maps to its translated message) plus a
// Portuguese `message`, so callers can use either.
//
// Model
// - `annualRatePercent` is a NOMINAL annual rate, compounded `n` times per year
//   (monthly 12, quarterly 4, semi-annual 2, annual 1). The effective annual rate is
//   (1 + rate / n)^n − 1.
// - Money grows month by month with the monthly factor (1 + rate / n)^(n / 12), which is
//   exactly consistent with that effective annual rate.
// - Contributions are made at the END of each month (monthly) or at the END of each year
//   (yearly). The initial investment is made at the start.
// - When contributions and compounding line up (e.g. monthly + monthly) this equals the
//   standard future-value-of-an-annuity formula.
//
// It is a simple projection: no taxes, fees, inflation or investment risk.

export type ContributionFrequency = 'monthly' | 'yearly'
export type CompoundingFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual'

/** How many times per year interest is compounded for each option. */
export const COMPOUNDING_PERIODS_PER_YEAR: Record<CompoundingFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
}

/** Longest supported duration, in whole years (also bounds the size of the schedule). */
export const MAX_YEARS = 100

export interface CompoundInterestInput {
  /** Capital inicial, in euros. */
  initialInvestment: number
  /** Reforço periódico, in euros (0 for none). */
  contribution: number
  contributionFrequency: ContributionFrequency
  /** Nominal annual interest rate, in percent (0 allowed). */
  annualRatePercent: number
  /** Duration in whole years, from 1 to {@link MAX_YEARS}. */
  years: number
  compounding: CompoundingFrequency
}

/** Balance at the end of a given year (year 0 is the start). */
export interface GrowthPoint {
  year: number
  /** Total paid in so far (initial investment + contributions). */
  invested: number
  /** Estimated balance. */
  balance: number
  /** Interest earned so far (balance − invested). */
  interest: number
}

export type CompoundInterestErrorCode =
  | 'invalidNumber'
  | 'initialNegative'
  | 'contributionNegative'
  | 'rateNegative'
  | 'yearsInvalid'
  | 'frequencyInvalid'
  | 'resultOverflow'

export interface CompoundInterestError {
  status: 'error'
  code: CompoundInterestErrorCode
  message: string
}

export type CompoundInterestResult =
  | {
      status: 'ok'
      /** Saldo final estimado. */
      finalBalance: number
      /** Total investido (capital inicial + reforços). */
      totalInvested: number
      /** Juros ganhos. */
      totalInterest: number
      /** Taxa de juro efetiva anual, in percent. */
      effectiveAnnualRatePercent: number
      /** Share of the final balance that is money paid in, in percent (0 when the balance is 0). */
      principalPercent: number
      /** Share of the final balance that is interest, in percent (0 when the balance is 0). */
      interestPercent: number
      /** One point per year, from year 0 to the last year (length = years + 1). */
      schedule: GrowthPoint[]
    }
  | CompoundInterestError

const ERROR_MESSAGES: Record<CompoundInterestErrorCode, string> = {
  invalidNumber: 'Introduz valores numéricos válidos.',
  initialNegative: 'O capital inicial não pode ser negativo.',
  contributionNegative: 'O reforço periódico não pode ser negativo.',
  rateNegative: 'A taxa de juro não pode ser negativa.',
  yearsInvalid: `A duração tem de ser um número inteiro de anos, entre 1 e ${MAX_YEARS}.`,
  frequencyInvalid: 'Escolhe uma frequência válida.',
  resultOverflow: 'O resultado não é um número válido.',
}

function fail(code: CompoundInterestErrorCode): CompoundInterestError {
  return { status: 'error', code, message: ERROR_MESSAGES[code] }
}

function isContributionFrequency(value: unknown): value is ContributionFrequency {
  return value === 'monthly' || value === 'yearly'
}

function isCompoundingFrequency(value: unknown): value is CompoundingFrequency {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(COMPOUNDING_PERIODS_PER_YEAR, value)
}

/**
 * Projects the growth of an investment year by year.
 *
 * Validation, checked in this order: all numbers finite; capital, contribution and rate
 * not negative (zero allowed); duration a whole number of years between 1 and 100; both
 * frequencies valid; result finite.
 */
export function calculateCompoundGrowth(input: CompoundInterestInput): CompoundInterestResult {
  const { initialInvestment, contribution, contributionFrequency, annualRatePercent, years, compounding } = input

  if (
    !Number.isFinite(initialInvestment) ||
    !Number.isFinite(contribution) ||
    !Number.isFinite(annualRatePercent) ||
    !Number.isFinite(years)
  ) {
    return fail('invalidNumber')
  }
  if (initialInvestment < 0) return fail('initialNegative')
  if (contribution < 0) return fail('contributionNegative')
  if (annualRatePercent < 0) return fail('rateNegative')
  if (!Number.isInteger(years) || years < 1 || years > MAX_YEARS) return fail('yearsInvalid')
  if (!isContributionFrequency(contributionFrequency) || !isCompoundingFrequency(compounding)) {
    return fail('frequencyInvalid')
  }

  // `-0` (e.g. from typing "-0") is normalized to `0` so it never shows up in results.
  const initial = initialInvestment === 0 ? 0 : initialInvestment
  const regular = contribution === 0 ? 0 : contribution
  const rate = annualRatePercent === 0 ? 0 : annualRatePercent

  const periodsPerYear = COMPOUNDING_PERIODS_PER_YEAR[compounding]
  const periodicRate = rate / 100 / periodsPerYear
  const effectiveAnnualRate = Math.pow(1 + periodicRate, periodsPerYear) - 1
  const monthlyGrowth = rate === 0 ? 1 : Math.pow(1 + periodicRate, periodsPerYear / 12)
  const monthlyContributions = contributionFrequency === 'monthly'

  let balance = initial
  let lastPoint: GrowthPoint = { year: 0, invested: initial, balance: initial, interest: 0 }
  const schedule: GrowthPoint[] = [lastPoint]

  for (let month = 1; month <= years * 12; month += 1) {
    balance *= monthlyGrowth
    const isYearEnd = month % 12 === 0
    if (monthlyContributions || isYearEnd) balance += regular

    if (isYearEnd) {
      const year = month / 12
      const contributionsMade = monthlyContributions ? month : year
      const invested = initial + regular * contributionsMade
      // With no interest the balance is exactly what was paid in (avoids rounding dust
      // from adding the contribution over and over). Otherwise the balance can never be
      // below what was paid in, so any floating-point dust is clamped away.
      const pointBalance = rate === 0 ? invested : Math.max(invested, balance)
      lastPoint = { year, invested, balance: pointBalance, interest: pointBalance - invested }
      schedule.push(lastPoint)
    }
  }

  const finalBalance = lastPoint.balance
  const totalInvested = lastPoint.invested
  const totalInterest = lastPoint.interest
  const effectiveAnnualRatePercent = effectiveAnnualRate * 100

  if (
    !Number.isFinite(finalBalance) ||
    !Number.isFinite(totalInvested) ||
    !Number.isFinite(totalInterest) ||
    !Number.isFinite(effectiveAnnualRatePercent)
  ) {
    return fail('resultOverflow')
  }

  const principalPercent = finalBalance > 0 ? (totalInvested / finalBalance) * 100 : 0
  const interestPercent = finalBalance > 0 ? 100 - principalPercent : 0

  return {
    status: 'ok',
    finalBalance,
    totalInvested,
    totalInterest,
    effectiveAnnualRatePercent,
    principalPercent,
    interestPercent,
    schedule,
  }
}

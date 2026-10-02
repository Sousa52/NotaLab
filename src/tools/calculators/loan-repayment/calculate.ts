// Pure fixed-rate loan repayment logic — no React, no DOM, no eval/Function. Every function
// returns a typed result instead of throwing, matching the pattern used across NotaLab's
// other calculators.
//
// Errors carry a stable `code` (which the UI maps to its translated message) plus a
// Portuguese `message`, so callers can use either.
//
// Model (standard fixed-rate annuity)
// - The financed amount is the loan amount minus the down payment.
// - The monthly rate is the annual nominal rate divided by 12.
// - The contractual instalment is  P × i / (1 − (1 + i)^−n)  (P / n when i = 0).
// - Each month: interest = balance × i; principal = instalment − interest. An optional
//   additional repayment is applied after the regular instalment, capped at what is left.
// - The last scheduled month clears whatever is left, so the final payment never exceeds
//   the remaining balance plus interest and the balance can never go negative.
//
// It is an estimate: no bank fees, insurance, taxes or early-repayment charges, and not
// an official bank offer.

export type LoanTermUnit = 'years' | 'months'

/** Longest supported term, in months (50 years). Keeps the schedule a reasonable size. */
export const MAX_TERM_MONTHS = 600

/** Highest accepted annual nominal rate, in percent. */
export const MAX_RATE_PERCENT = 100

export interface LoanInput {
  /** Total loan amount before the down payment, in euros. */
  loanAmount: number
  /** Annual nominal interest rate, in percent (0 allowed). */
  annualRatePercent: number
  /** Duration, as a whole number in `termUnit`. */
  term: number
  termUnit: LoanTermUnit
  /** Optional upfront payment that reduces the financed amount, in euros (0 for none). */
  downPayment: number
  /** Optional additional repayment made every month on top of the instalment (0 for none). */
  extraMonthlyPayment: number
}

export interface AmortizationRow {
  /** Month number, starting at 1. */
  month: number
  startBalance: number
  /** Principal repaid through the regular instalment. */
  principal: number
  interest: number
  /** Additional repayment applied after the regular instalment. */
  additional: number
  endBalance: number
}

export type LoanErrorCode =
  | 'invalidNumber'
  | 'amountNotPositive'
  | 'downPaymentNegative'
  | 'downPaymentTooHigh'
  | 'rateOutOfRange'
  | 'termInvalid'
  | 'extraNegative'
  | 'resultOverflow'

export interface LoanError {
  status: 'error'
  code: LoanErrorCode
  message: string
}

export type LoanResult =
  | {
      status: 'ok'
      /** Loan amount minus the down payment. */
      financedAmount: number
      downPayment: number
      /** Contractual duration, in months. */
      termMonths: number
      /** Prestação mensal contratual, without additional repayments. */
      monthlyInstalment: number
      /** Instalment plus the additional monthly repayment. */
      monthlyPaymentWithExtra: number
      /** Total interest paid (with the additional repayments, when there are any). */
      totalInterest: number
      /** Financed amount + total interest (the down payment is not included). */
      totalRepaid: number
      /** Months until the loan is fully repaid. Equals `termMonths` without additional repayments. */
      payoffMonths: number
      /** Months saved compared with the contractual duration. */
      monthsSaved: number
      /** Total interest without additional repayments. */
      baselineTotalInterest: number
      /** Total repaid without additional repayments. */
      baselineTotalRepaid: number
      /** Interest saved through the additional repayments (0 without them). */
      interestSaved: number
      /** True when an additional monthly repayment was supplied. */
      hasExtra: boolean
      /** Month-by-month schedule (with the additional repayments, when there are any). */
      schedule: AmortizationRow[]
    }
  | LoanError

const ERROR_MESSAGES: Record<LoanErrorCode, string> = {
  invalidNumber: 'Introduz valores numéricos válidos.',
  amountNotPositive: 'O montante do crédito tem de ser maior que zero.',
  downPaymentNegative: 'A entrada não pode ser negativa.',
  downPaymentTooHigh: 'A entrada tem de ser inferior ao montante do crédito.',
  rateOutOfRange: `A taxa de juro tem de estar entre 0 e ${MAX_RATE_PERCENT}%.`,
  termInvalid: `A duração tem de ser um número inteiro, até ${MAX_TERM_MONTHS / 12} anos (${MAX_TERM_MONTHS} meses).`,
  extraNegative: 'O reforço mensal não pode ser negativo.',
  resultOverflow: 'O resultado não é um número válido.',
}

function fail(code: LoanErrorCode): LoanError {
  return { status: 'error', code, message: ERROR_MESSAGES[code] }
}

/**
 * Standard annuity instalment: P × i / (1 − (1 + i)^−n), or P / n when there is no interest.
 * Uses log1p/expm1 so the formula stays accurate for very small rates.
 */
function annuityInstalment(financed: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return financed / months
  const denominator = -Math.expm1(-months * Math.log1p(monthlyRate))
  return (financed * monthlyRate) / denominator
}

interface Simulation {
  rows: AmortizationRow[]
  totalInterest: number
}

/** Runs the month-by-month repayment for a given additional monthly repayment. */
function simulate(
  financed: number,
  monthlyRate: number,
  instalment: number,
  extra: number,
  termMonths: number,
): Simulation {
  const rows: AmortizationRow[] = []
  let balance = financed
  let totalInterest = 0

  for (let month = 1; month <= termMonths && balance > 0; month += 1) {
    const startBalance = balance
    const interest = startBalance * monthlyRate
    // The last scheduled month clears whatever is left, absorbing floating-point dust.
    const scheduledPrincipal = month === termMonths ? startBalance : Math.max(0, instalment - interest)
    const principal = Math.min(startBalance, scheduledPrincipal)
    const remaining = startBalance - principal
    // Applied after the regular instalment and never more than what is still owed.
    const additional = Math.min(extra, remaining)
    const endBalance = remaining - additional

    rows.push({ month, startBalance, principal, interest, additional, endBalance })
    totalInterest += interest
    balance = endBalance
  }

  return { rows, totalInterest }
}

/**
 * Estimates the repayment of a fixed-rate loan.
 *
 * Validation, checked in this order: all numbers finite; loan amount greater than zero;
 * down payment not negative and lower than the loan amount; rate between 0 and 100;
 * term a whole number from 1 month to 50 years; additional repayment not negative; result
 * finite.
 */
export function calculateLoan(input: LoanInput): LoanResult {
  const { loanAmount, annualRatePercent, term, termUnit, downPayment, extraMonthlyPayment } = input

  if (
    !Number.isFinite(loanAmount) ||
    !Number.isFinite(annualRatePercent) ||
    !Number.isFinite(term) ||
    !Number.isFinite(downPayment) ||
    !Number.isFinite(extraMonthlyPayment)
  ) {
    return fail('invalidNumber')
  }
  if (loanAmount <= 0) return fail('amountNotPositive')
  if (downPayment < 0) return fail('downPaymentNegative')
  if (downPayment >= loanAmount) return fail('downPaymentTooHigh')
  if (annualRatePercent < 0 || annualRatePercent > MAX_RATE_PERCENT) return fail('rateOutOfRange')

  if ((termUnit !== 'years' && termUnit !== 'months') || !Number.isInteger(term)) return fail('termInvalid')
  const termMonths = termUnit === 'years' ? term * 12 : term
  if (termMonths < 1 || termMonths > MAX_TERM_MONTHS) return fail('termInvalid')

  if (extraMonthlyPayment < 0) return fail('extraNegative')

  // `-0` (e.g. from typing "-0") is normalized to `0` so it never shows up in results.
  const down = downPayment === 0 ? 0 : downPayment
  const extra = extraMonthlyPayment === 0 ? 0 : extraMonthlyPayment
  const rate = annualRatePercent === 0 ? 0 : annualRatePercent

  const financedAmount = loanAmount - down
  const monthlyRate = rate / 100 / 12
  const monthlyInstalment = annuityInstalment(financedAmount, monthlyRate, termMonths)

  const baseline = simulate(financedAmount, monthlyRate, monthlyInstalment, 0, termMonths)
  const hasExtra = extra > 0
  const actual = hasExtra ? simulate(financedAmount, monthlyRate, monthlyInstalment, extra, termMonths) : baseline

  const baselineTotalInterest = baseline.totalInterest
  const baselineTotalRepaid = financedAmount + baselineTotalInterest
  const totalInterest = actual.totalInterest
  const totalRepaid = financedAmount + totalInterest
  const payoffMonths = actual.rows.length
  const monthlyPaymentWithExtra = monthlyInstalment + extra

  const figures = [
    monthlyInstalment,
    monthlyPaymentWithExtra,
    baselineTotalInterest,
    baselineTotalRepaid,
    totalInterest,
    totalRepaid,
  ]
  if (!figures.every((value) => Number.isFinite(value))) return fail('resultOverflow')

  return {
    status: 'ok',
    financedAmount,
    downPayment: down,
    termMonths,
    monthlyInstalment,
    monthlyPaymentWithExtra,
    totalInterest,
    totalRepaid,
    payoffMonths,
    monthsSaved: termMonths - payoffMonths,
    baselineTotalInterest,
    baselineTotalRepaid,
    interestSaved: Math.max(0, baselineTotalInterest - totalInterest),
    hasExtra,
    schedule: actual.rows,
  }
}

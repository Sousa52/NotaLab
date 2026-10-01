// Pure gross-to-net salary estimate — no React, no DOM, no eval/Function. Every function
// returns a typed result instead of throwing, matching the pattern used across NotaLab's
// other calculators.
//
// Errors carry a stable `code` (which the UI maps to its translated message) plus a
// Portuguese `message`, so callers can use either.
//
// This is a simple percentage-based estimate. It contains NO IRS tables: the IRS
// withholding rate is supplied by the user and is only an assumption. Other deductions
// and benefits are not modelled.

export const PAYMENTS_PER_YEAR_OPTIONS = [12, 14] as const
export type PaymentsPerYear = (typeof PAYMENTS_PER_YEAR_OPTIONS)[number]

/** Default employee Social Security rate, in percent. Editable by the user. */
export const DEFAULT_SOCIAL_SECURITY_RATE = 11

export interface SalaryInput {
  /** Monthly gross salary, in euros. */
  grossMonthly: number
  /** Number of salary payments per year (12 or 14). */
  paymentsPerYear: number
  /** IRS withholding rate, in percent, as entered by the user. */
  irsRatePercent: number
  /** Employee Social Security rate, in percent. */
  socialSecurityRatePercent: number
}

export type SalaryErrorCode =
  | 'invalidNumber'
  | 'grossNegative'
  | 'paymentsInvalid'
  | 'rateOutOfRange'
  | 'deductionsExceedGross'
  | 'resultOverflow'

export interface SalaryError {
  status: 'error'
  code: SalaryErrorCode
  message: string
}

export type SalaryResult =
  | {
      status: 'ok'
      /** Desconto estimado para a Segurança Social (monthly). */
      socialSecurityAmount: number
      /** Retenção estimada de IRS (monthly). */
      irsAmount: number
      /** Segurança Social + IRS (monthly). */
      totalDeductions: number
      /** Salário líquido mensal estimado. */
      netMonthly: number
      /** Salário bruto anual estimado. */
      grossAnnual: number
      /** Salário líquido anual estimado. */
      netAnnual: number
    }
  | SalaryError

const ERROR_MESSAGES: Record<SalaryErrorCode, string> = {
  invalidNumber: 'Introduz valores numéricos válidos.',
  grossNegative: 'O salário bruto não pode ser negativo.',
  paymentsInvalid: 'O número de pagamentos anuais tem de ser 12 ou 14.',
  rateOutOfRange: 'As taxas têm de estar entre 0 e 100.',
  deductionsExceedGross: 'Os descontos não podem ser superiores ao salário bruto.',
  resultOverflow: 'O resultado não é um número válido.',
}

function fail(code: SalaryErrorCode): SalaryError {
  return { status: 'error', code, message: ERROR_MESSAGES[code] }
}

function isRateInRange(rate: number): boolean {
  return rate >= 0 && rate <= 100
}

/**
 * Estimates monthly and annual net salary from a gross salary and two percentages.
 *
 *   Segurança Social = bruto × taxa SS / 100
 *   IRS = bruto × taxa IRS / 100
 *   Líquido mensal = bruto − SS − IRS
 *   Bruto anual = bruto mensal × pagamentos
 *   Líquido anual = líquido mensal × pagamentos
 *
 * Validation, checked in this order: all values finite; gross not negative; payments are
 * 12 or 14; each rate between 0 and 100; the two rates together do not exceed 100 (so the
 * deductions cannot exceed the gross salary).
 */
export function calculateSalary(input: SalaryInput): SalaryResult {
  const { grossMonthly, paymentsPerYear, irsRatePercent, socialSecurityRatePercent } = input

  if (
    !Number.isFinite(grossMonthly) ||
    !Number.isFinite(paymentsPerYear) ||
    !Number.isFinite(irsRatePercent) ||
    !Number.isFinite(socialSecurityRatePercent)
  ) {
    return fail('invalidNumber')
  }
  if (grossMonthly < 0) return fail('grossNegative')
  if (!(PAYMENTS_PER_YEAR_OPTIONS as readonly number[]).includes(paymentsPerYear)) {
    return fail('paymentsInvalid')
  }
  if (!isRateInRange(irsRatePercent) || !isRateInRange(socialSecurityRatePercent)) {
    return fail('rateOutOfRange')
  }
  if (irsRatePercent + socialSecurityRatePercent > 100) return fail('deductionsExceedGross')

  // `-0` (e.g. from typing "-0") is normalized to `0` so it never shows up in results.
  const gross = grossMonthly === 0 ? 0 : grossMonthly
  const irsRate = irsRatePercent === 0 ? 0 : irsRatePercent
  const ssRate = socialSecurityRatePercent === 0 ? 0 : socialSecurityRatePercent

  const socialSecurityAmount = (gross * ssRate) / 100
  const irsAmount = (gross * irsRate) / 100
  const totalDeductions = socialSecurityAmount + irsAmount
  // Mathematically ≥ 0 (the rates sum to at most 100); the clamp only removes
  // floating-point noise when the deductions use up the whole salary.
  const netMonthly = Math.max(0, gross - socialSecurityAmount - irsAmount)
  const grossAnnual = gross * paymentsPerYear
  const netAnnual = netMonthly * paymentsPerYear

  const values = [socialSecurityAmount, irsAmount, totalDeductions, netMonthly, grossAnnual, netAnnual]
  if (!values.every((value) => Number.isFinite(value))) return fail('resultOverflow')

  return { status: 'ok', socialSecurityAmount, irsAmount, totalDeductions, netMonthly, grossAnnual, netAnnual }
}

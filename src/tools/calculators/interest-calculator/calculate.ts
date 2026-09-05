// Pure interest-calculation logic — no React, no DOM, no eval/Function. Every
// function returns a typed result instead of throwing, matching the pattern used
// across NotaLab's other calculators.
//
// The user enters a rate PER PERIOD and a matching number of periods (e.g. "5% per
// year" + "10 periods" = 10 years). This module never converts between time units or
// invents a compounding convention — that interpretation is entirely up to what the
// user enters, and is explained in the UI rather than assumed here.

export type InterestResult =
  | { status: 'ok'; interest: number; amount: number }
  | { status: 'error'; message: string }

/** Checks shared across both modes: finiteness, non-negative capital, non-negative periods. */
function validateBasicInputs(capital: number, ratePercent: number, periods: number): string | null {
  if (!Number.isFinite(capital) || !Number.isFinite(ratePercent) || !Number.isFinite(periods)) {
    return 'Introduz valores numéricos válidos.'
  }
  if (capital < 0) {
    return 'O capital inicial não pode ser negativo.'
  }
  if (periods < 0) {
    return 'O número de períodos não pode ser negativo.'
  }
  return null
}

/** Wraps a computed pair, guarding against overflow to NaN/Infinity in extreme cases. */
function ok(interest: number, amount: number): InterestResult {
  if (!Number.isFinite(interest) || !Number.isFinite(amount)) {
    return { status: 'error', message: 'O resultado não é um número válido.' }
  }
  return { status: 'ok', interest, amount }
}

/**
 * Juros simples: J = C × i × t; M = C + J.
 * Pure multiplication, so it's well-defined for any finite rate (including deeply
 * negative ones) — there's no mathematical domain restriction to enforce here beyond
 * the shared capital/periods checks.
 */
export function calculateSimpleInterest(capital: number, ratePercent: number, periods: number): InterestResult {
  const validationError = validateBasicInputs(capital, ratePercent, periods)
  if (validationError) return { status: 'error', message: validationError }

  const rate = ratePercent / 100
  const interest = capital * rate * periods
  const amount = capital + interest
  return ok(interest, amount)
}

/**
 * Juros compostos: M = C × (1 + i)^t; J = M - C.
 * A rate below -100% makes (1 + i) negative, which combined with a non-integer
 * number of periods produces NaN (raising a negative base to a fractional exponent
 * has no real result) — and even with integer periods, it produces an
 * alternating-sign "amount" that doesn't correspond to any sensible interest
 * scenario. Exactly -100% is allowed: it has a well-defined meaning (total loss,
 * amount = 0).
 */
export function calculateCompoundInterest(capital: number, ratePercent: number, periods: number): InterestResult {
  const validationError = validateBasicInputs(capital, ratePercent, periods)
  if (validationError) return { status: 'error', message: validationError }
  if (ratePercent < -100) {
    return {
      status: 'error',
      message: 'A taxa de juro não pode ser inferior a -100% em juro composto.',
    }
  }

  const rate = ratePercent / 100
  const amount = capital * Math.pow(1 + rate, periods)
  const interest = amount - capital
  return ok(interest, amount)
}

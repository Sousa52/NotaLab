// Pure IVA (VAT) calculation logic — no React, no DOM, no eval/Function. Every function
// returns a typed result instead of throwing, matching the pattern used across NotaLab's
// other calculators.
//
// Errors carry a stable `code` (which the UI maps to its translated message) plus a
// Portuguese `message`, so callers can use either.
//
// This is a plain arithmetic helper: it does not decide which rate applies to a given
// product, service, region or legal situation.

export type VatRateId = 'reduced' | 'intermediate' | 'normal' | 'custom'

/** Mainland Portugal IVA rates, in percent. Other regions and situations can differ. */
export const VAT_RATES: Record<Exclude<VatRateId, 'custom'>, number> = {
  reduced: 6,
  intermediate: 13,
  normal: 23,
}

export type VatErrorCode = 'invalidNumber' | 'amountNegative' | 'rateNegative' | 'resultOverflow'

export interface VatError {
  status: 'error'
  code: VatErrorCode
  message: string
}

export type VatResult =
  | {
      status: 'ok'
      /** Valor sem IVA. */
      netAmount: number
      /** Valor do IVA. */
      vatAmount: number
      /** Valor com IVA. */
      grossAmount: number
      /** The rate used, in percent. */
      ratePercent: number
    }
  | VatError

const ERROR_MESSAGES: Record<VatErrorCode, string> = {
  invalidNumber: 'Introduz valores numéricos válidos.',
  amountNegative: 'O valor não pode ser negativo.',
  rateNegative: 'A taxa de IVA não pode ser negativa.',
  resultOverflow: 'O resultado não é um número válido.',
}

function fail(code: VatErrorCode): VatError {
  return { status: 'error', code, message: ERROR_MESSAGES[code] }
}

/** Shared validation. Returns an error, or null when both values are usable. */
function validate(amount: number, ratePercent: number): VatError | null {
  if (!Number.isFinite(amount) || !Number.isFinite(ratePercent)) return fail('invalidNumber')
  if (amount < 0) return fail('amountNegative')
  if (ratePercent < 0) return fail('rateNegative')
  return null
}

/**
 * Adicionar IVA.
 *   IVA = valor sem IVA × taxa / 100
 *   Total = valor sem IVA + IVA
 *
 * The amount and the rate must be finite and not negative (zero is allowed).
 */
export function addVat(netAmountInput: number, ratePercent: number): VatResult {
  const invalid = validate(netAmountInput, ratePercent)
  if (invalid) return invalid

  // `-0` (e.g. from typing "-0") is normalized to `0` so it never shows up in results.
  const netAmount = netAmountInput === 0 ? 0 : netAmountInput
  const rate = ratePercent === 0 ? 0 : ratePercent
  const vatAmount = (netAmount * rate) / 100
  const grossAmount = netAmount + vatAmount

  if (!Number.isFinite(vatAmount) || !Number.isFinite(grossAmount)) return fail('resultOverflow')
  return { status: 'ok', netAmount, vatAmount, grossAmount, ratePercent: rate }
}

/**
 * Retirar IVA.
 *   Valor sem IVA = valor com IVA / (1 + taxa / 100)
 *   IVA incluído = valor com IVA − valor sem IVA
 *
 * Computed as `valor × 100 / (100 + taxa)`, which is the same formula with one rounding
 * step fewer. The divisor is always at least 100, so there is no division by zero.
 */
export function removeVat(grossAmountInput: number, ratePercent: number): VatResult {
  const invalid = validate(grossAmountInput, ratePercent)
  if (invalid) return invalid

  const grossAmount = grossAmountInput === 0 ? 0 : grossAmountInput
  const rate = ratePercent === 0 ? 0 : ratePercent
  // A 0% rate removes nothing; handled exactly to avoid `x * 100 / 100 !== x` noise.
  const rawNet = rate === 0 ? grossAmount : (grossAmount * 100) / (100 + rate)

  if (!Number.isFinite(rawNet)) return fail('resultOverflow')

  // Mathematically net ≤ gross; this only guards against floating-point noise
  // producing a (tiny) negative IVA amount.
  const netAmount = Math.min(grossAmount, rawNet)
  const vatAmount = grossAmount - netAmount

  return { status: 'ok', netAmount, vatAmount, grossAmount, ratePercent: rate }
}

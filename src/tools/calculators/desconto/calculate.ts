// Pure discount-calculation logic — no React, no DOM, no eval/Function. Every function
// returns a typed result instead of throwing, matching the pattern used across NotaLab's
// other calculators.
//
// Errors carry a stable `code` (which the UI maps to its translated message) plus a
// Portuguese `message`, so callers can use either.

export type DiscountErrorCode =
  | 'invalidNumber'
  | 'originalNotPositive'
  | 'percentOutOfRange'
  | 'finalNegative'
  | 'finalExceedsOriginal'
  | 'resultOverflow'

export interface DiscountError {
  status: 'error'
  code: DiscountErrorCode
  message: string
}

export type DiscountAmountResult =
  | { status: 'ok'; discountAmount: number; finalPrice: number }
  | DiscountError

export type DiscountPercentageResult =
  | { status: 'ok'; discountPercent: number; discountAmount: number }
  | DiscountError

const ERROR_MESSAGES: Record<DiscountErrorCode, string> = {
  invalidNumber: 'Introduz valores numéricos válidos.',
  originalNotPositive: 'O preço original tem de ser maior que zero.',
  percentOutOfRange: 'A percentagem de desconto tem de estar entre 0 e 100.',
  finalNegative: 'O preço final não pode ser negativo.',
  finalExceedsOriginal: 'O preço final não pode ser superior ao preço original.',
  resultOverflow: 'O resultado não é um número válido.',
}

function fail(code: DiscountErrorCode): DiscountError {
  return { status: 'error', code, message: ERROR_MESSAGES[code] }
}

/**
 * Mode 1 — discount from a percentage.
 *   desconto = preço original × percentagem / 100
 *   preço final = preço original − desconto
 *
 * The original price must be greater than zero and the percentage must be between 0 and
 * 100 (both inclusive).
 */
export function calculateDiscount(originalPrice: number, discountPercent: number): DiscountAmountResult {
  if (!Number.isFinite(originalPrice) || !Number.isFinite(discountPercent)) return fail('invalidNumber')
  if (originalPrice <= 0) return fail('originalNotPositive')
  if (discountPercent < 0 || discountPercent > 100) return fail('percentOutOfRange')

  // A 100% discount is exact by definition; this also avoids a tiny floating-point
  // remainder (or a tiny negative price) from `x * 100 / 100 !== x`.
  const discountAmount = discountPercent === 100 ? originalPrice : (originalPrice * discountPercent) / 100
  const finalPrice = Math.max(0, originalPrice - discountAmount)

  if (!Number.isFinite(discountAmount) || !Number.isFinite(finalPrice)) return fail('resultOverflow')
  return { status: 'ok', discountAmount, finalPrice }
}

/**
 * Mode 2 — effective discount percentage from the original and final prices.
 *   desconto % = (preço original − preço final) / preço original × 100
 *
 * The original price must be greater than zero, and the final price must be between 0 and
 * the original price (both inclusive).
 */
export function calculateDiscountPercentage(originalPrice: number, finalPrice: number): DiscountPercentageResult {
  if (!Number.isFinite(originalPrice) || !Number.isFinite(finalPrice)) return fail('invalidNumber')
  if (originalPrice <= 0) return fail('originalNotPositive')
  if (finalPrice < 0) return fail('finalNegative')
  if (finalPrice > originalPrice) return fail('finalExceedsOriginal')

  const discountAmount = originalPrice - finalPrice
  // A free final price is exactly a 100% discount; avoids division rounding noise.
  const rawPercent = finalPrice === 0 ? 100 : (discountAmount / originalPrice) * 100

  // Checked before clamping so an overflow can never be hidden by the clamp below.
  if (!Number.isFinite(discountAmount) || !Number.isFinite(rawPercent)) return fail('resultOverflow')

  const discountPercent = Math.min(100, Math.max(0, rawPercent))
  return { status: 'ok', discountPercent, discountAmount }
}

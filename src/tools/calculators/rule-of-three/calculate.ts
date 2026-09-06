// Pure rule-of-three calculation logic — no React, no DOM, no eval/Function. Every
// function returns a typed result instead of throwing, matching the pattern used
// across NotaLab's other calculators.

export type RuleOfThreeResult = { status: 'ok'; value: number } | { status: 'error'; message: string }

function invalid(): RuleOfThreeResult {
  return { status: 'error', message: 'Introduz valores numéricos válidos.' }
}

/** Wraps a computed value, guarding against overflow to NaN/Infinity in extreme cases. */
function ok(value: number): RuleOfThreeResult {
  if (!Number.isFinite(value)) {
    return { status: 'error', message: 'O resultado não é um número válido.' }
  }
  return { status: 'ok', value }
}

/**
 * Direct proportion: A : B = C : X, so X = (B × C) / A.
 * A is the denominator here, so it must be non-zero — B and C may validly be zero.
 */
export function calculateDirectProportion(a: number, b: number, c: number): RuleOfThreeResult {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return invalid()
  if (a === 0) {
    return { status: 'error', message: 'O valor A não pode ser zero.' }
  }
  return ok((b * c) / a)
}

/**
 * Inverse proportion: A × B = C × X, so X = (A × B) / C.
 * C is the denominator here, so it must be non-zero — A and B may validly be zero.
 */
export function calculateInverseProportion(a: number, b: number, c: number): RuleOfThreeResult {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return invalid()
  if (c === 0) {
    return { status: 'error', message: 'O valor C não pode ser zero.' }
  }
  return ok((a * b) / c)
}

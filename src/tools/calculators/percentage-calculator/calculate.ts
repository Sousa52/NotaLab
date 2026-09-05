// Pure percentage-calculation logic — no React, no DOM, no eval. Every function
// returns a typed result instead of throwing, matching the pattern used across
// NotaLab's other calculators (grade-converter, apa-reference-generator, ...).

export type PercentageResult = { status: 'ok'; value: number } | { status: 'error'; message: string }

const INVALID_INPUT_MESSAGE = 'Introduz valores numéricos válidos.'

/** Wraps a computed value, guarding against overflow to NaN/Infinity in extreme cases. */
function ok(value: number): PercentageResult {
  if (!Number.isFinite(value)) {
    return { status: 'error', message: 'O resultado não é um número válido.' }
  }
  return { status: 'ok', value }
}

function invalid(): PercentageResult {
  return { status: 'error', message: INVALID_INPUT_MESSAGE }
}

/** 1. Percent of a number — e.g. 20% de 150 = 30. */
export function percentOfNumber(percentage: number, value: number): PercentageResult {
  if (!Number.isFinite(percentage) || !Number.isFinite(value)) return invalid()
  return ok((percentage / 100) * value)
}

/** 2. What percentage `part` is of `total` — e.g. 30 é que percentagem de 150? = 20%. */
export function whatPercentage(part: number, total: number): PercentageResult {
  if (!Number.isFinite(part) || !Number.isFinite(total)) return invalid()
  if (total === 0) {
    return { status: 'error', message: 'O total não pode ser zero.' }
  }
  return ok((part / total) * 100)
}

/** 3. Percentage increase — e.g. 150 aumentado 20% = 180. */
export function percentageIncrease(original: number, percentage: number): PercentageResult {
  if (!Number.isFinite(original) || !Number.isFinite(percentage)) return invalid()
  return ok(original * (1 + percentage / 100))
}

/** 4. Percentage decrease — e.g. 150 diminuído 20% = 120. */
export function percentageDecrease(original: number, percentage: number): PercentageResult {
  if (!Number.isFinite(original) || !Number.isFinite(percentage)) return invalid()
  return ok(original * (1 - percentage / 100))
}

/**
 * 5. Percentage difference between two values: |A - B| / ((A + B) / 2) × 100.
 * e.g. 100 e 120 = 18,18%.
 *
 * Defined only for non-negative values, matching the standard convention for this
 * formula (it measures relative difference between real-world magnitudes, such as
 * prices or measurements — allowing negative inputs could produce a negative
 * "difference", which isn't a meaningful result for this operation).
 */
export function percentageDifference(a: number, b: number): PercentageResult {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return invalid()
  if (a < 0 || b < 0) {
    return { status: 'error', message: 'Os valores para a diferença percentual têm de ser maiores ou iguais a zero.' }
  }
  if (a + b === 0) {
    return {
      status: 'error',
      message: 'Não é possível calcular a diferença percentual quando a soma dos dois valores é zero.',
    }
  }
  return ok((Math.abs(a - b) / ((a + b) / 2)) * 100)
}

/** Parses a user-typed number, accepting both "," and "." as decimal separator. */
export function parseLocaleNumber(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export function isValidGrade(value: number): boolean {
  return value >= 0 && value <= 20
}

export function isValidPercentage(value: number): boolean {
  return value > 0 && value <= 100
}

export function isPositive(value: number): boolean {
  return value > 0
}

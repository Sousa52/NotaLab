import { describe, expect, it } from 'vitest'
import { isPositive, isValidGrade, isValidPercentage, parseLocaleNumber } from './validation'

describe('parseLocaleNumber', () => {
  it('parses dot decimals', () => {
    expect(parseLocaleNumber('14.5')).toBe(14.5)
  })

  it('parses comma decimals (pt-PT)', () => {
    expect(parseLocaleNumber('14,5')).toBe(14.5)
  })

  it('returns null for empty input', () => {
    expect(parseLocaleNumber('')).toBeNull()
    expect(parseLocaleNumber('   ')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseLocaleNumber('abc')).toBeNull()
  })
})

describe('isValidGrade', () => {
  it('accepts the 0-20 range', () => {
    expect(isValidGrade(0)).toBe(true)
    expect(isValidGrade(20)).toBe(true)
    expect(isValidGrade(14.5)).toBe(true)
  })

  it('rejects out-of-range values', () => {
    expect(isValidGrade(-1)).toBe(false)
    expect(isValidGrade(20.1)).toBe(false)
  })
})

describe('isValidPercentage', () => {
  it('accepts values above 0 and up to 100', () => {
    expect(isValidPercentage(0.5)).toBe(true)
    expect(isValidPercentage(100)).toBe(true)
  })

  it('rejects zero, negative and above 100', () => {
    expect(isValidPercentage(0)).toBe(false)
    expect(isValidPercentage(-5)).toBe(false)
    expect(isValidPercentage(100.1)).toBe(false)
  })
})

describe('isPositive', () => {
  it('rejects zero and negative values', () => {
    expect(isPositive(0)).toBe(false)
    expect(isPositive(-1)).toBe(false)
    expect(isPositive(0.1)).toBe(true)
  })
})

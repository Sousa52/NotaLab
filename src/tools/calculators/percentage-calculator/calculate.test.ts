import { describe, expect, it } from 'vitest'
import { formatGrade } from '../../../lib/format'
import {
  percentOfNumber,
  percentageDecrease,
  percentageDifference,
  percentageIncrease,
  whatPercentage,
} from './calculate'

describe('percentOfNumber', () => {
  it('computes the standard example: 20% de 150 = 30', () => {
    const result = percentOfNumber(20, 150)
    expect(result).toEqual({ status: 'ok', value: 30 })
  })

  it('handles 0%', () => {
    expect(percentOfNumber(0, 150)).toEqual({ status: 'ok', value: 0 })
  })

  it('handles 100%', () => {
    expect(percentOfNumber(100, 150)).toEqual({ status: 'ok', value: 150 })
  })

  it('handles a fractional percentage', () => {
    expect(percentOfNumber(12.5, 200)).toEqual({ status: 'ok', value: 25 })
  })

  it('handles a negative value (meaningful, e.g. a loss)', () => {
    expect(percentOfNumber(20, -150)).toEqual({ status: 'ok', value: -30 })
  })

  it('handles large values', () => {
    expect(percentOfNumber(20, 1_000_000)).toEqual({ status: 'ok', value: 200_000 })
  })

  it('rejects non-finite input', () => {
    expect(percentOfNumber(Number.NaN, 150).status).toBe('error')
    expect(percentOfNumber(20, Number.POSITIVE_INFINITY).status).toBe('error')
  })
})

describe('whatPercentage', () => {
  it('computes the standard example: 30 é que percentagem de 150? = 20%', () => {
    expect(whatPercentage(30, 150)).toEqual({ status: 'ok', value: 20 })
  })

  it('handles a part of 0', () => {
    expect(whatPercentage(0, 150)).toEqual({ status: 'ok', value: 0 })
  })

  it('handles the 100% case (part equals total)', () => {
    expect(whatPercentage(150, 150)).toEqual({ status: 'ok', value: 100 })
  })

  it('handles a fractional result', () => {
    expect(whatPercentage(45, 60)).toEqual({ status: 'ok', value: 75 })
  })

  it('handles a negative total (meaningful — yields a negative percentage)', () => {
    expect(whatPercentage(30, -150)).toEqual({ status: 'ok', value: -20 })
  })

  it('rejects division by zero', () => {
    const result = whatPercentage(30, 0)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toContain('zero')
    }
  })

  it('rejects non-finite input', () => {
    expect(whatPercentage(Number.POSITIVE_INFINITY, 150).status).toBe('error')
    expect(whatPercentage(30, Number.NaN).status).toBe('error')
  })
})

describe('percentageIncrease', () => {
  it('computes the standard example: 150 aumentado 20% = 180', () => {
    expect(percentageIncrease(150, 20)).toEqual({ status: 'ok', value: 180 })
  })

  it('handles a 0% increase (no change)', () => {
    expect(percentageIncrease(150, 0)).toEqual({ status: 'ok', value: 150 })
  })

  it('handles a 100% increase (doubles the value)', () => {
    expect(percentageIncrease(100, 100)).toEqual({ status: 'ok', value: 200 })
  })

  it('handles a fractional percentage', () => {
    expect(percentageIncrease(200, 12.5)).toEqual({ status: 'ok', value: 225 })
  })

  it('handles a negative original value', () => {
    expect(percentageIncrease(-100, 20)).toEqual({ status: 'ok', value: -120 })
  })

  it('handles large values', () => {
    expect(percentageIncrease(1_000_000, 50)).toEqual({ status: 'ok', value: 1_500_000 })
  })

  it('rejects non-finite input', () => {
    expect(percentageIncrease(Number.NaN, 20).status).toBe('error')
  })
})

describe('percentageDecrease', () => {
  it('computes the standard example: 150 diminuído 20% = 120', () => {
    expect(percentageDecrease(150, 20)).toEqual({ status: 'ok', value: 120 })
  })

  it('handles a 0% decrease (no change)', () => {
    expect(percentageDecrease(150, 0)).toEqual({ status: 'ok', value: 150 })
  })

  it('handles a 100% decrease (reaches zero)', () => {
    expect(percentageDecrease(150, 100)).toEqual({ status: 'ok', value: 0 })
  })

  it('handles a fractional percentage', () => {
    expect(percentageDecrease(200, 12.5)).toEqual({ status: 'ok', value: 175 })
  })

  it('handles a decrease over 100%, correctly going negative', () => {
    expect(percentageDecrease(100, 150)).toEqual({ status: 'ok', value: -50 })
  })

  it('rejects non-finite input', () => {
    expect(percentageDecrease(150, Number.POSITIVE_INFINITY).status).toBe('error')
  })
})

describe('percentageDifference', () => {
  it('computes the standard example: 100 e 120 ≈ 18,18%', () => {
    const result = percentageDifference(100, 120)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(18.181818, 4)
      // Matches the exact spec example once rounded through the shared formatter.
      expect(formatGrade(result.value)).toBe('18,18')
    }
  })

  it('is zero for two equal values', () => {
    expect(percentageDifference(100, 100)).toEqual({ status: 'ok', value: 0 })
  })

  it('handles decimal values', () => {
    const result = percentageDifference(50.5, 60.5)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(18.018018, 4)
    }
  })

  it('handles large values', () => {
    const result = percentageDifference(1000, 2000)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(66.666667, 4)
    }
  })

  it('rejects negative inputs as not meaningful for this formula', () => {
    expect(percentageDifference(-5, 10).status).toBe('error')
    expect(percentageDifference(5, -10).status).toBe('error')
  })

  it('rejects the case where both values are zero (division by zero)', () => {
    const result = percentageDifference(0, 0)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toContain('zero')
    }
  })

  it('rejects non-finite input', () => {
    expect(percentageDifference(Number.NaN, 100).status).toBe('error')
    expect(percentageDifference(100, Number.POSITIVE_INFINITY).status).toBe('error')
  })
})

import { describe, expect, it } from 'vitest'
import { parseLocaleNumber } from '../../../lib/validation'
import { calculateDiscount, calculateDiscountPercentage } from './calculate'
import type { DiscountErrorCode } from './calculate'

function discount(originalPrice: number, discountPercent: number) {
  const result = calculateDiscount(originalPrice, discountPercent)
  if (result.status !== 'ok') {
    throw new Error(`Expected an ok result for (${originalPrice}, ${discountPercent}), got ${result.code}`)
  }
  return result
}

function percentage(originalPrice: number, finalPrice: number) {
  const result = calculateDiscountPercentage(originalPrice, finalPrice)
  if (result.status !== 'ok') {
    throw new Error(`Expected an ok result for (${originalPrice}, ${finalPrice}), got ${result.code}`)
  }
  return result
}

describe('calculateDiscount — normal cases', () => {
  // [originalPrice, discountPercent, discountAmount, finalPrice]
  const cases: [number, number, number, number][] = [
    [100, 20, 20, 80],
    [200, 10, 20, 180],
    [80, 25, 20, 60],
    [50, 50, 25, 25],
    [1000000, 25, 250000, 750000],
    [100, 1, 1, 99],
    [100, 99, 99, 1],
  ]

  it.each(cases)('%d with %d%% off', (original, percent, amount, final) => {
    const result = discount(original, percent)
    expect(result.discountAmount).toBeCloseTo(amount, 8)
    expect(result.finalPrice).toBeCloseTo(final, 8)
  })

  it('keeps discount amount + final price equal to the original price', () => {
    const pairs: [number, number][] = [
      [19.99, 15],
      [59.9, 33.3],
      [1234.56, 7.5],
      [0.99, 12.5],
      [100, 0.1],
    ]
    for (const [original, percent] of pairs) {
      const result = discount(original, percent)
      expect(result.discountAmount + result.finalPrice).toBeCloseTo(original, 8)
    }
  })
})

describe('calculateDiscount — zero and full discount', () => {
  it('0% discount leaves the price unchanged', () => {
    expect(discount(100, 0)).toEqual({ status: 'ok', discountAmount: 0, finalPrice: 100 })
  })

  it('0% discount on a decimal price leaves it unchanged', () => {
    expect(discount(59.99, 0)).toEqual({ status: 'ok', discountAmount: 0, finalPrice: 59.99 })
  })

  it('100% discount makes the item free', () => {
    expect(discount(100, 100)).toEqual({ status: 'ok', discountAmount: 100, finalPrice: 0 })
  })

  it('100% discount on a decimal price gives exactly zero (never a tiny negative)', () => {
    const result = discount(59.99, 100)
    expect(result.discountAmount).toBe(59.99)
    expect(result.finalPrice).toBe(0)
  })

  it('accepts 100% on very large prices without overflowing', () => {
    expect(discount(1e308, 100)).toEqual({ status: 'ok', discountAmount: 1e308, finalPrice: 0 })
  })
})

describe('calculateDiscount — decimals', () => {
  it('handles a decimal price', () => {
    const result = discount(19.99, 20)
    expect(result.discountAmount).toBeCloseTo(3.998, 8)
    expect(result.finalPrice).toBeCloseTo(15.992, 8)
  })

  it('handles a decimal percentage', () => {
    expect(discount(100, 12.5)).toEqual({ status: 'ok', discountAmount: 12.5, finalPrice: 87.5 })
  })

  it('handles a decimal price and a decimal percentage', () => {
    const result = discount(59.9, 33.3)
    expect(result.discountAmount).toBeCloseTo(19.9467, 6)
    expect(result.finalPrice).toBeCloseTo(39.9533, 6)
  })

  it('handles a very small percentage', () => {
    const result = discount(1000, 0.1)
    expect(result.discountAmount).toBeCloseTo(1, 8)
    expect(result.finalPrice).toBeCloseTo(999, 8)
  })

  it('handles a very small price', () => {
    const result = discount(0.01, 50)
    expect(result.discountAmount).toBeCloseTo(0.005, 10)
    expect(result.finalPrice).toBeCloseTo(0.005, 10)
  })
})

describe('calculateDiscountPercentage — normal cases', () => {
  // [originalPrice, finalPrice, discountPercent, discountAmount]
  const cases: [number, number, number, number][] = [
    [100, 80, 20, 20],
    [200, 150, 25, 50],
    [80, 60, 25, 20],
    [0.5, 0.25, 50, 0.25],
    [50, 49, 2, 1],
    [1000, 1, 99.9, 999],
    [3, 2, 33.3333333333, 1],
  ]

  it.each(cases)('%d → %d', (original, final, percent, amount) => {
    const result = percentage(original, final)
    expect(result.discountPercent).toBeCloseTo(percent, 8)
    expect(result.discountAmount).toBeCloseTo(amount, 8)
  })

  it('handles decimal prices', () => {
    const result = percentage(19.99, 14.99)
    expect(result.discountAmount).toBeCloseTo(5, 8)
    expect(result.discountPercent).toBeCloseTo(25.0125063, 5)
  })

  it('handles a very small discount', () => {
    const result = percentage(1000, 999.99)
    expect(result.discountAmount).toBeCloseTo(0.01, 8)
    expect(result.discountPercent).toBeCloseTo(0.001, 8)
  })

  it('handles very large prices without overflowing', () => {
    const result = percentage(1e308, 1)
    expect(result.discountPercent).toBeCloseTo(100, 8)
  })
})

describe('calculateDiscountPercentage — no discount and full discount', () => {
  it('is 0% when the final price equals the original price', () => {
    expect(percentage(100, 100)).toEqual({ status: 'ok', discountPercent: 0, discountAmount: 0 })
  })

  it('is 0% for an equal decimal price', () => {
    expect(percentage(59.99, 59.99)).toEqual({ status: 'ok', discountPercent: 0, discountAmount: 0 })
  })

  it('is 100% when the final price is zero', () => {
    expect(percentage(100, 0)).toEqual({ status: 'ok', discountPercent: 100, discountAmount: 100 })
  })

  it('is exactly 100% for a decimal original with a zero final price', () => {
    expect(percentage(59.99, 0).discountPercent).toBe(100)
  })

  it('is exactly 100% for very large prices with a zero final price', () => {
    expect(percentage(1e308, 0)).toEqual({ status: 'ok', discountPercent: 100, discountAmount: 1e308 })
  })
})

describe('both modes agree (round trip)', () => {
  it('recovers the percentage from the final price', () => {
    const pairs: [number, number][] = [
      [100, 20],
      [19.99, 15],
      [59.9, 33.3],
      [1234.56, 7.5],
      [0.99, 12.5],
      [250, 0],
      [250, 100],
    ]
    for (const [original, percent] of pairs) {
      const { finalPrice } = discount(original, percent)
      expect(percentage(original, finalPrice).discountPercent).toBeCloseTo(percent, 8)
    }
  })
})

describe('calculateDiscount — validation', () => {
  it.each<[number, number, DiscountErrorCode]>([
    [NaN, 10, 'invalidNumber'],
    [100, NaN, 'invalidNumber'],
    [NaN, NaN, 'invalidNumber'],
    [Infinity, 10, 'invalidNumber'],
    [-Infinity, 10, 'invalidNumber'],
    [100, Infinity, 'invalidNumber'],
    [100, -Infinity, 'invalidNumber'],
    [0, 10, 'originalNotPositive'],
    [-50, 10, 'originalNotPositive'],
    [-0.01, 10, 'originalNotPositive'],
    [100, -0.01, 'percentOutOfRange'],
    [100, -5, 'percentOutOfRange'],
    [100, 100.01, 'percentOutOfRange'],
    [100, 150, 'percentOutOfRange'],
    [1e308, 50, 'resultOverflow'],
  ])('(%d, %d) → %s', (original, percent, code) => {
    expect(calculateDiscount(original, percent)).toMatchObject({ status: 'error', code })
  })

  it('reports an invalid original price before an invalid percentage', () => {
    expect(calculateDiscount(0, 150)).toMatchObject({ code: 'originalNotPositive' })
  })

  it('reports non-finite values before range errors', () => {
    expect(calculateDiscount(NaN, 150)).toMatchObject({ code: 'invalidNumber' })
  })

  it('includes a non-empty message on errors', () => {
    const result = calculateDiscount(0, 10)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('never throws on bad input', () => {
    expect(() => calculateDiscount(NaN, NaN)).not.toThrow()
    expect(() => calculateDiscount(-1, 1000)).not.toThrow()
  })
})

describe('calculateDiscountPercentage — validation', () => {
  it.each<[number, number, DiscountErrorCode]>([
    [NaN, 50, 'invalidNumber'],
    [100, NaN, 'invalidNumber'],
    [Infinity, 50, 'invalidNumber'],
    [100, Infinity, 'invalidNumber'],
    [100, -Infinity, 'invalidNumber'],
    [0, 0, 'originalNotPositive'],
    [0, 10, 'originalNotPositive'],
    [-10, 5, 'originalNotPositive'],
    [100, -1, 'finalNegative'],
    [100, -0.01, 'finalNegative'],
    [100, 100.01, 'finalExceedsOriginal'],
    [100, 150, 'finalExceedsOriginal'],
    [0.5, 0.51, 'finalExceedsOriginal'],
  ])('(%d, %d) → %s', (original, final, code) => {
    expect(calculateDiscountPercentage(original, final)).toMatchObject({ status: 'error', code })
  })

  it('reports an invalid original price before an invalid final price', () => {
    expect(calculateDiscountPercentage(0, -5)).toMatchObject({ code: 'originalNotPositive' })
  })

  it('reports a negative final price before a final price above the original', () => {
    expect(calculateDiscountPercentage(100, -5)).toMatchObject({ code: 'finalNegative' })
  })

  it('includes a non-empty message on errors', () => {
    const result = calculateDiscountPercentage(100, 150)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('never throws on bad input', () => {
    expect(() => calculateDiscountPercentage(NaN, NaN)).not.toThrow()
    expect(() => calculateDiscountPercentage(-1, 1000)).not.toThrow()
  })
})

describe('with Portuguese decimal input (parseLocaleNumber)', () => {
  function parsed(raw: string): number {
    const value = parseLocaleNumber(raw)
    if (value === null) throw new Error(`Could not parse ${raw}`)
    return value
  }

  it('calculates a discount from comma-decimal input', () => {
    const result = discount(parsed('199,90'), parsed('15,5'))
    expect(result.discountAmount).toBeCloseTo(30.9845, 6)
    expect(result.finalPrice).toBeCloseTo(168.9155, 6)
  })

  it('accepts a dot decimal separator too', () => {
    const result = discount(parsed('199.90'), parsed('15.5'))
    expect(result.discountAmount).toBeCloseTo(30.9845, 6)
    expect(result.finalPrice).toBeCloseTo(168.9155, 6)
  })

  it('calculates the effective percentage from comma-decimal prices', () => {
    const result = percentage(parsed('49,99'), parsed('39,99'))
    expect(result.discountAmount).toBeCloseTo(10, 8)
    expect(result.discountPercent).toBeCloseTo(20.004, 3)
  })

  it('leaves unparseable text for the UI to reject before calculating', () => {
    expect(parseLocaleNumber('abc')).toBeNull()
    expect(parseLocaleNumber('')).toBeNull()
  })
})

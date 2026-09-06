import { describe, expect, it } from 'vitest'
import { calculateDirectProportion, calculateInverseProportion } from './calculate'

describe('calculateDirectProportion', () => {
  it('computes the UI example: 2 → 6, 5 → X ⇒ X = 15', () => {
    expect(calculateDirectProportion(2, 6, 5)).toEqual({ status: 'ok', value: 15 })
  })

  it('handles decimal inputs', () => {
    const result = calculateDirectProportion(1.5, 3, 4)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(8, 6)
    }
  })

  it('handles a fractional (non-integer) result', () => {
    const result = calculateDirectProportion(3, 1, 1)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(0.333333, 5)
    }
  })

  it('allows B = 0 as a valid numerator', () => {
    expect(calculateDirectProportion(5, 0, 10)).toEqual({ status: 'ok', value: 0 })
  })

  it('allows C = 0 as a valid numerator', () => {
    expect(calculateDirectProportion(5, 10, 0)).toEqual({ status: 'ok', value: 0 })
  })

  it('handles large values', () => {
    expect(calculateDirectProportion(2, 1_000_000, 5)).toEqual({ status: 'ok', value: 2_500_000 })
  })

  it('handles a negative numerator input (meaningful, e.g. a signed quantity)', () => {
    expect(calculateDirectProportion(2, -6, 5)).toEqual({ status: 'ok', value: -15 })
  })

  it('handles a negative A (still a valid non-zero denominator)', () => {
    expect(calculateDirectProportion(-2, 6, 5)).toEqual({ status: 'ok', value: -15 })
  })

  it('rejects A = 0 (it is the denominator)', () => {
    const result = calculateDirectProportion(0, 6, 5)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toContain('A')
    }
  })

  it('rejects NaN input', () => {
    expect(calculateDirectProportion(Number.NaN, 6, 5).status).toBe('error')
  })

  it('rejects Infinity input', () => {
    expect(calculateDirectProportion(2, Number.POSITIVE_INFINITY, 5).status).toBe('error')
  })

  it('rejects -Infinity input', () => {
    expect(calculateDirectProportion(2, 6, Number.NEGATIVE_INFINITY).status).toBe('error')
  })

  it('handles floating-point precision cleanly', () => {
    const result = calculateDirectProportion(10, 0.1, 0.2)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(0.002, 10)
    }
  })
})

describe('calculateInverseProportion', () => {
  it('computes the UI example: 2 → 10, 5 → X ⇒ X = 4', () => {
    expect(calculateInverseProportion(2, 10, 5)).toEqual({ status: 'ok', value: 4 })
  })

  it('handles decimal inputs', () => {
    const result = calculateInverseProportion(1.5, 4, 3)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(2, 6)
    }
  })

  it('handles a fractional (non-integer) result', () => {
    const result = calculateInverseProportion(1, 1, 3)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(0.333333, 5)
    }
  })

  it('allows A = 0 as a valid numerator', () => {
    expect(calculateInverseProportion(0, 10, 5)).toEqual({ status: 'ok', value: 0 })
  })

  it('allows B = 0 as a valid numerator', () => {
    expect(calculateInverseProportion(5, 0, 10)).toEqual({ status: 'ok', value: 0 })
  })

  it('handles large values', () => {
    expect(calculateInverseProportion(1_000_000, 2, 5)).toEqual({ status: 'ok', value: 400_000 })
  })

  it('handles a negative numerator input (meaningful, e.g. a signed quantity)', () => {
    expect(calculateInverseProportion(2, -10, 5)).toEqual({ status: 'ok', value: -4 })
  })

  it('handles a negative C (still a valid non-zero denominator)', () => {
    expect(calculateInverseProportion(2, 10, -5)).toEqual({ status: 'ok', value: -4 })
  })

  it('rejects C = 0 (it is the denominator)', () => {
    const result = calculateInverseProportion(2, 10, 0)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toContain('C')
    }
  })

  it('rejects NaN input', () => {
    expect(calculateInverseProportion(Number.NaN, 10, 5).status).toBe('error')
  })

  it('rejects Infinity input', () => {
    expect(calculateInverseProportion(2, Number.POSITIVE_INFINITY, 5).status).toBe('error')
  })

  it('rejects -Infinity input', () => {
    expect(calculateInverseProportion(2, 10, Number.NEGATIVE_INFINITY).status).toBe('error')
  })

  it('handles floating-point precision cleanly', () => {
    const result = calculateInverseProportion(0.1, 0.2, 10)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.value).toBeCloseTo(0.002, 10)
    }
  })
})

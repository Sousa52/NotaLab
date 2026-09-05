import { describe, expect, it } from 'vitest'
import { calculateCompoundInterest, calculateSimpleInterest } from './calculate'

describe('calculateSimpleInterest', () => {
  it('computes the standard example: 1000€, 5%, 2 períodos → 100€ juros, 1100€ montante', () => {
    expect(calculateSimpleInterest(1000, 5, 2)).toEqual({ status: 'ok', interest: 100, amount: 1100 })
  })

  it('handles 0% interest (no change)', () => {
    expect(calculateSimpleInterest(1000, 0, 5)).toEqual({ status: 'ok', interest: 0, amount: 1000 })
  })

  it('handles 0 periods (no change)', () => {
    expect(calculateSimpleInterest(1000, 5, 0)).toEqual({ status: 'ok', interest: 0, amount: 1000 })
  })

  it('handles decimal capital', () => {
    const result = calculateSimpleInterest(1500.5, 10, 1)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(150.05, 5)
      expect(result.amount).toBeCloseTo(1650.55, 5)
    }
  })

  it('handles a decimal interest rate', () => {
    const result = calculateSimpleInterest(1000, 2.5, 4)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(100, 5)
      expect(result.amount).toBeCloseTo(1100, 5)
    }
  })

  it('handles a decimal number of periods (simple interest is pure multiplication, so this is well-defined)', () => {
    const result = calculateSimpleInterest(1000, 10, 1.5)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(150, 5)
      expect(result.amount).toBeCloseTo(1150, 5)
    }
  })

  it('handles multiple periods', () => {
    const result = calculateSimpleInterest(2000, 3, 10)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(600, 5)
      expect(result.amount).toBeCloseTo(2600, 5)
    }
  })

  it('handles large values', () => {
    const result = calculateSimpleInterest(1_000_000, 5, 1)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(50_000, 3)
      expect(result.amount).toBeCloseTo(1_050_000, 3)
    }
  })

  it('has no domain restriction on very negative rates, unlike compound interest (pure multiplication is always defined)', () => {
    const result = calculateSimpleInterest(1000, -150, 1)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(-1500, 5)
      expect(result.amount).toBeCloseTo(-500, 5)
    }
  })

  it('rejects negative capital', () => {
    expect(calculateSimpleInterest(-100, 5, 2).status).toBe('error')
  })

  it('rejects a negative number of periods', () => {
    expect(calculateSimpleInterest(1000, 5, -2).status).toBe('error')
  })

  it('rejects non-finite input', () => {
    expect(calculateSimpleInterest(Number.NaN, 5, 2).status).toBe('error')
    expect(calculateSimpleInterest(1000, Number.POSITIVE_INFINITY, 2).status).toBe('error')
    expect(calculateSimpleInterest(1000, 5, Number.NaN).status).toBe('error')
  })
})

describe('calculateCompoundInterest', () => {
  it('computes the standard example: 1000€, 5%, 2 períodos → 102,50€ juros, 1102,50€ montante', () => {
    const result = calculateCompoundInterest(1000, 5, 2)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(102.5, 6)
      expect(result.amount).toBeCloseTo(1102.5, 6)
    }
  })

  it('handles 0% interest (no change) — exact, since (1+0)^t is always exactly 1', () => {
    expect(calculateCompoundInterest(1000, 0, 5)).toEqual({ status: 'ok', interest: 0, amount: 1000 })
  })

  it('handles 0 periods (no change) — exact, since anything^0 is exactly 1', () => {
    expect(calculateCompoundInterest(1000, 5, 0)).toEqual({ status: 'ok', interest: 0, amount: 1000 })
  })

  it('handles decimal capital', () => {
    const result = calculateCompoundInterest(2000.5, 10, 1)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(200.05, 5)
      expect(result.amount).toBeCloseTo(2200.55, 5)
    }
  })

  it('handles a decimal interest rate', () => {
    const result = calculateCompoundInterest(1000, 2.5, 2)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(50.625, 3)
      expect(result.amount).toBeCloseTo(1050.625, 3)
    }
  })

  it('handles multiple periods', () => {
    const result = calculateCompoundInterest(1000, 10, 5)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(610.51, 2)
      expect(result.amount).toBeCloseTo(1610.51, 2)
    }
  })

  it('handles large values', () => {
    const result = calculateCompoundInterest(1_000_000, 5, 1)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(50_000, 3)
      expect(result.amount).toBeCloseTo(1_050_000, 3)
    }
  })

  it('handles a negative rate above -100% (a real, meaningful loss scenario)', () => {
    const result = calculateCompoundInterest(1000, -10, 2)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.interest).toBeCloseTo(-190, 5)
      expect(result.amount).toBeCloseTo(810, 5)
    }
  })

  it('allows exactly -100% as a boundary case (total loss, amount = 0)', () => {
    expect(calculateCompoundInterest(1000, -100, 3)).toEqual({ status: 'ok', interest: -1000, amount: 0 })
  })

  it('rejects a rate below -100%, which would make (1 + i) negative', () => {
    const result = calculateCompoundInterest(1000, -150, 2)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toContain('-100%')
    }
  })

  it('rejects negative capital', () => {
    expect(calculateCompoundInterest(-100, 5, 2).status).toBe('error')
  })

  it('rejects a negative number of periods', () => {
    expect(calculateCompoundInterest(1000, 5, -2).status).toBe('error')
  })

  it('rejects non-finite input', () => {
    expect(calculateCompoundInterest(Number.NaN, 5, 2).status).toBe('error')
    expect(calculateCompoundInterest(1000, Number.POSITIVE_INFINITY, 2).status).toBe('error')
    expect(calculateCompoundInterest(1000, 5, Number.NaN).status).toBe('error')
  })
})

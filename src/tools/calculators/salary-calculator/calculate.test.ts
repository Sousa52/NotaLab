import { describe, expect, it } from 'vitest'
import { parseLocaleNumber } from '../../../lib/validation'
import { DEFAULT_SOCIAL_SECURITY_RATE, PAYMENTS_PER_YEAR_OPTIONS, calculateSalary } from './calculate'
import type { SalaryErrorCode, SalaryInput, SalaryResult } from './calculate'

type SalaryOk = Extract<SalaryResult, { status: 'ok' }>

const BASE: SalaryInput = {
  grossMonthly: 1000,
  paymentsPerYear: 14,
  irsRatePercent: 10,
  socialSecurityRatePercent: 11,
}

function input(overrides: Partial<SalaryInput> = {}): SalaryInput {
  return { ...BASE, ...overrides }
}

function salary(overrides: Partial<SalaryInput> = {}): SalaryOk {
  const result = calculateSalary(input(overrides))
  if (result.status !== 'ok') {
    throw new Error(`Expected an ok result, got ${result.code}`)
  }
  return result
}

describe('constants', () => {
  it('defaults the Social Security rate to 11%', () => {
    expect(DEFAULT_SOCIAL_SECURITY_RATE).toBe(11)
  })

  it('offers 12 and 14 payments per year', () => {
    expect([...PAYMENTS_PER_YEAR_OPTIONS]).toEqual([12, 14])
  })
})

describe('calculateSalary — gross to net', () => {
  // [gross, payments, irs %, ss %, ssAmount, irsAmount, netMonthly, grossAnnual, netAnnual]
  const cases: [number, number, number, number, number, number, number, number, number][] = [
    // basic, 14 and 12 payments
    [1000, 14, 10, 11, 110, 100, 790, 14000, 11060],
    [1000, 12, 10, 11, 110, 100, 790, 12000, 9480],
    [1500, 14, 15, 11, 165, 225, 1110, 21000, 15540],
    [2000, 12, 20, 11, 220, 400, 1380, 24000, 16560],
    // zero IRS withholding
    [820, 14, 0, 11, 90.2, 0, 729.8, 11480, 10217.2],
    // custom Social Security rates
    [1000, 14, 10, 9, 90, 100, 810, 14000, 11340],
    [1000, 12, 10, 0, 0, 100, 900, 12000, 10800],
    // different IRS rates
    [1200, 14, 5, 11, 132, 60, 1008, 16800, 14112],
    [1200, 14, 25, 11, 132, 300, 768, 16800, 10752],
    [1200, 14, 37, 11, 132, 444, 624, 16800, 8736],
    // decimal amounts and rates
    [1234.56, 14, 12.5, 11, 135.8016, 154.32, 944.4384, 17283.84, 13222.1376],
    [999.99, 12, 8.25, 11.5, 114.99885, 82.499175, 802.491975, 11999.88, 9629.9037],
  ]

  it.each(cases)(
    '%d € × %d, IRS %d%%, SS %d%%',
    (gross, payments, irs, ss, ssAmount, irsAmount, net, grossAnnual, netAnnual) => {
      const result = salary({
        grossMonthly: gross,
        paymentsPerYear: payments,
        irsRatePercent: irs,
        socialSecurityRatePercent: ss,
      })
      expect(result.socialSecurityAmount).toBeCloseTo(ssAmount, 6)
      expect(result.irsAmount).toBeCloseTo(irsAmount, 6)
      expect(result.totalDeductions).toBeCloseTo(ssAmount + irsAmount, 6)
      expect(result.netMonthly).toBeCloseTo(net, 6)
      expect(result.grossAnnual).toBeCloseTo(grossAnnual, 6)
      expect(result.netAnnual).toBeCloseTo(netAnnual, 6)
    },
  )

  it('gives the same monthly figures for 12 and 14 payments', () => {
    const twelve = salary({ paymentsPerYear: 12 })
    const fourteen = salary({ paymentsPerYear: 14 })
    expect(twelve.netMonthly).toBe(fourteen.netMonthly)
    expect(twelve.socialSecurityAmount).toBe(fourteen.socialSecurityAmount)
    expect(twelve.irsAmount).toBe(fourteen.irsAmount)
    expect(twelve.grossAnnual).toBe(12000)
    expect(fourteen.grossAnnual).toBe(14000)
  })

  it('applies the default 11% Social Security rate', () => {
    const result = salary({ socialSecurityRatePercent: DEFAULT_SOCIAL_SECURITY_RATE })
    expect(result.socialSecurityAmount).toBe(110)
  })

  it('with a zero IRS rate, only Social Security is deducted', () => {
    const result = salary({ irsRatePercent: 0 })
    expect(result.irsAmount).toBe(0)
    expect(result.netMonthly).toBeCloseTo(890, 10)
  })

  it('with both rates at zero, net equals gross', () => {
    const result = salary({ irsRatePercent: 0, socialSecurityRatePercent: 0 })
    expect(result.totalDeductions).toBe(0)
    expect(result.netMonthly).toBe(1000)
    expect(result.netAnnual).toBe(14000)
  })

  it('returns zeros for a zero salary', () => {
    expect(calculateSalary(input({ grossMonthly: 0, paymentsPerYear: 12 }))).toEqual({
      status: 'ok',
      socialSecurityAmount: 0,
      irsAmount: 0,
      totalDeductions: 0,
      netMonthly: 0,
      grossAnnual: 0,
      netAnnual: 0,
    })
  })
})

describe('calculateSalary — deductions that use up the whole salary', () => {
  it('accepts rates that sum to exactly 100% and leaves no net salary', () => {
    const result = salary({ irsRatePercent: 89, socialSecurityRatePercent: 11 })
    expect(result.socialSecurityAmount).toBe(110)
    expect(result.irsAmount).toBe(890)
    expect(result.netMonthly).toBe(0)
  })

  it('accepts a single rate of 100%', () => {
    const result = salary({ irsRatePercent: 100, socialSecurityRatePercent: 0 })
    expect(result.irsAmount).toBe(1000)
    expect(result.netMonthly).toBe(0)
  })
})

describe('calculateSalary — annual totals', () => {
  it('annual gross is exactly the monthly gross × payments', () => {
    expect(salary({ grossMonthly: 1234.56 }).grossAnnual).toBe(1234.56 * 14)
  })

  it('annual net is exactly the monthly net × payments', () => {
    const result = salary({ grossMonthly: 1234.56, paymentsPerYear: 12 })
    expect(result.netAnnual).toBe(result.netMonthly * 12)
  })
})

describe('calculateSalary — floating-point precision', () => {
  it('keeps Social Security + IRS + net equal to gross for awkward decimals', () => {
    const grossValues = [19.99, 1234.56, 0.07, 999.99, 3456.78]
    const rates: [number, number][] = [
      [10, 11],
      [7.3, 11],
      [0, 9.5],
    ]
    for (const gross of grossValues) {
      for (const [irs, ss] of rates) {
        const result = salary({ grossMonthly: gross, irsRatePercent: irs, socialSecurityRatePercent: ss })
        expect(result.socialSecurityAmount + result.irsAmount + result.netMonthly).toBeCloseTo(gross, 8)
        expect(result.totalDeductions).toBeCloseTo(result.socialSecurityAmount + result.irsAmount, 10)
        expect(result.netMonthly).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('handles very small and very large salaries', () => {
    const small = salary({ grossMonthly: 0.001 })
    expect(small.netMonthly).toBeCloseTo(0.00079, 12)

    const large = salary({ grossMonthly: 1e9 })
    expect(large.netMonthly).toBeCloseTo(7.9e8, 3)
    expect(large.netAnnual).toBeCloseTo(1.106e10, 2)
  })

  it('never returns a negative net salary when deductions use up an awkward gross', () => {
    const result = salary({ grossMonthly: 1234.56, irsRatePercent: 89, socialSecurityRatePercent: 11 })
    expect(result.netMonthly).toBeGreaterThanOrEqual(0)
    expect(result.netMonthly).toBeCloseTo(0, 8)
  })

  it('normalizes a negative-zero salary to zero', () => {
    const result = salary({ grossMonthly: -0 })
    expect(result.netMonthly).toBe(0)
    expect(result.grossAnnual).toBe(0)
  })

  it('normalizes a negative-zero IRS rate to zero', () => {
    expect(salary({ irsRatePercent: -0 }).irsAmount).toBe(0)
  })
})

describe('calculateSalary — validation', () => {
  it.each<[Partial<SalaryInput>, SalaryErrorCode]>([
    // non-finite values
    [{ grossMonthly: NaN }, 'invalidNumber'],
    [{ grossMonthly: Infinity }, 'invalidNumber'],
    [{ grossMonthly: -Infinity }, 'invalidNumber'],
    [{ irsRatePercent: NaN }, 'invalidNumber'],
    [{ irsRatePercent: Infinity }, 'invalidNumber'],
    [{ socialSecurityRatePercent: NaN }, 'invalidNumber'],
    [{ socialSecurityRatePercent: -Infinity }, 'invalidNumber'],
    [{ paymentsPerYear: NaN }, 'invalidNumber'],
    [{ paymentsPerYear: Infinity }, 'invalidNumber'],
    // negative gross
    [{ grossMonthly: -1 }, 'grossNegative'],
    [{ grossMonthly: -0.01 }, 'grossNegative'],
    [{ grossMonthly: -1000 }, 'grossNegative'],
    // payments must be 12 or 14
    [{ paymentsPerYear: 0 }, 'paymentsInvalid'],
    [{ paymentsPerYear: 1 }, 'paymentsInvalid'],
    [{ paymentsPerYear: 11 }, 'paymentsInvalid'],
    [{ paymentsPerYear: 13 }, 'paymentsInvalid'],
    [{ paymentsPerYear: 15 }, 'paymentsInvalid'],
    [{ paymentsPerYear: 12.5 }, 'paymentsInvalid'],
    [{ paymentsPerYear: -12 }, 'paymentsInvalid'],
    // each rate between 0 and 100
    [{ irsRatePercent: -1 }, 'rateOutOfRange'],
    [{ irsRatePercent: -0.01 }, 'rateOutOfRange'],
    [{ irsRatePercent: 100.01 }, 'rateOutOfRange'],
    [{ irsRatePercent: 150 }, 'rateOutOfRange'],
    [{ socialSecurityRatePercent: -1 }, 'rateOutOfRange'],
    [{ socialSecurityRatePercent: -0.01 }, 'rateOutOfRange'],
    [{ socialSecurityRatePercent: 100.01 }, 'rateOutOfRange'],
    [{ socialSecurityRatePercent: 150 }, 'rateOutOfRange'],
    // deductions exceeding the gross salary
    [{ irsRatePercent: 90, socialSecurityRatePercent: 11 }, 'deductionsExceedGross'],
    [{ irsRatePercent: 50.01, socialSecurityRatePercent: 50 }, 'deductionsExceedGross'],
    [{ irsRatePercent: 100, socialSecurityRatePercent: 1 }, 'deductionsExceedGross'],
    [{ irsRatePercent: 0.5, socialSecurityRatePercent: 100 }, 'deductionsExceedGross'],
    [{ grossMonthly: 0, irsRatePercent: 90, socialSecurityRatePercent: 11 }, 'deductionsExceedGross'],
    // overflow
    [{ grossMonthly: 1e308 }, 'resultOverflow'],
    [{ grossMonthly: 1e308, irsRatePercent: 0, socialSecurityRatePercent: 0 }, 'resultOverflow'],
  ])('%j → %s', (overrides, code) => {
    expect(calculateSalary(input(overrides))).toMatchObject({ status: 'error', code })
  })

  it('reports non-finite values before negative ones', () => {
    expect(calculateSalary(input({ grossMonthly: NaN, irsRatePercent: -5 }))).toMatchObject({
      code: 'invalidNumber',
    })
  })

  it('reports a negative gross before an invalid number of payments', () => {
    expect(calculateSalary(input({ grossMonthly: -1, paymentsPerYear: 13 }))).toMatchObject({
      code: 'grossNegative',
    })
  })

  it('reports an invalid number of payments before an invalid rate', () => {
    expect(calculateSalary(input({ paymentsPerYear: 13, irsRatePercent: 150 }))).toMatchObject({
      code: 'paymentsInvalid',
    })
  })

  it('reports an out-of-range rate before the deductions check', () => {
    expect(calculateSalary(input({ irsRatePercent: 150, socialSecurityRatePercent: 0 }))).toMatchObject({
      code: 'rateOutOfRange',
    })
  })

  it('includes a non-empty message on errors', () => {
    const result = calculateSalary(input({ grossMonthly: -1 }))
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('never throws on bad input', () => {
    expect(() =>
      calculateSalary({
        grossMonthly: NaN,
        paymentsPerYear: NaN,
        irsRatePercent: NaN,
        socialSecurityRatePercent: NaN,
      }),
    ).not.toThrow()
    expect(() =>
      calculateSalary({
        grossMonthly: -1,
        paymentsPerYear: -1,
        irsRatePercent: -1,
        socialSecurityRatePercent: -1,
      }),
    ).not.toThrow()
  })
})

describe('calculateSalary — Portuguese decimal input (parseLocaleNumber)', () => {
  function parsed(raw: string): number {
    const value = parseLocaleNumber(raw)
    if (value === null) throw new Error(`Could not parse ${raw}`)
    return value
  }

  it('handles comma decimals', () => {
    const result = salary({
      grossMonthly: parsed('1234,56'),
      irsRatePercent: parsed('12,5'),
      socialSecurityRatePercent: parsed('11'),
    })
    expect(result.socialSecurityAmount).toBeCloseTo(135.8016, 6)
    expect(result.irsAmount).toBeCloseTo(154.32, 6)
    expect(result.netMonthly).toBeCloseTo(944.4384, 6)
  })

  it('accepts a dot decimal separator too', () => {
    const result = salary({
      grossMonthly: parsed('1234.56'),
      irsRatePercent: parsed('12.5'),
      socialSecurityRatePercent: parsed('11'),
    })
    expect(result.netMonthly).toBeCloseTo(944.4384, 6)
  })

  it('handles comma-decimal rates for both percentages', () => {
    const result = salary({
      grossMonthly: parsed('999,99'),
      paymentsPerYear: 12,
      irsRatePercent: parsed('8,25'),
      socialSecurityRatePercent: parsed('11,5'),
    })
    expect(result.netMonthly).toBeCloseTo(802.491975, 6)
    expect(result.netAnnual).toBeCloseTo(9629.9037, 6)
  })

  it('leaves unparseable text for the UI to reject before calculating', () => {
    expect(parseLocaleNumber('abc')).toBeNull()
    expect(parseLocaleNumber('')).toBeNull()
  })
})

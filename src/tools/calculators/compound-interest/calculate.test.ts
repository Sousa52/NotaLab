import { describe, expect, it } from 'vitest'
import { parseLocaleNumber } from '../../../lib/validation'
import { COMPOUNDING_PERIODS_PER_YEAR, MAX_YEARS, calculateCompoundGrowth } from './calculate'
import type { CompoundInterestErrorCode, CompoundInterestInput, CompoundInterestResult } from './calculate'

type GrowthOk = Extract<CompoundInterestResult, { status: 'ok' }>

const BASE: CompoundInterestInput = {
  initialInvestment: 1000,
  contribution: 100,
  contributionFrequency: 'monthly',
  annualRatePercent: 5,
  years: 10,
  compounding: 'monthly',
}

function input(overrides: Partial<CompoundInterestInput> = {}): CompoundInterestInput {
  return { ...BASE, ...overrides }
}

function growth(overrides: Partial<CompoundInterestInput> = {}): GrowthOk {
  const result = calculateCompoundGrowth(input(overrides))
  if (result.status !== 'ok') {
    throw new Error(`Expected an ok result, got ${result.code}`)
  }
  return result
}

// Independent closed-form formulas to check the year-by-year simulation against.

/** Future value of a lump sum: P × (1 + r / n)^(n × t). */
function lumpSum(principal: number, ratePercent: number, periodsPerYear: number, years: number): number {
  return principal * Math.pow(1 + ratePercent / 100 / periodsPerYear, periodsPerYear * years)
}

/** Future value of an ordinary annuity: C × ((1 + i)^N − 1) / i, with a zero-rate fallback. */
function annuity(payment: number, periodicRate: number, payments: number): number {
  if (periodicRate === 0) return payment * payments
  return (payment * (Math.pow(1 + periodicRate, payments) - 1)) / periodicRate
}

describe('constants', () => {
  it('maps each compounding option to periods per year', () => {
    expect(COMPOUNDING_PERIODS_PER_YEAR).toEqual({ monthly: 12, quarterly: 4, semiannual: 2, annual: 1 })
  })
})

describe('calculateCompoundGrowth — zero interest', () => {
  it('adds up monthly contributions exactly', () => {
    const result = growth({ annualRatePercent: 0 })
    expect(result.finalBalance).toBe(13000)
    expect(result.totalInvested).toBe(13000)
    expect(result.totalInterest).toBe(0)
    expect(result.effectiveAnnualRatePercent).toBe(0)
    expect(result.principalPercent).toBe(100)
    expect(result.interestPercent).toBe(0)
  })

  it('adds up yearly contributions exactly', () => {
    const result = growth({
      initialInvestment: 1000,
      contribution: 500,
      contributionFrequency: 'yearly',
      annualRatePercent: 0,
      years: 5,
    })
    expect(result.finalBalance).toBe(3500)
    expect(result.totalInterest).toBe(0)
  })

  it('keeps the balance equal to the amount invested for awkward decimals', () => {
    const result = growth({ initialInvestment: 0.1, contribution: 0.2, annualRatePercent: 0, years: 3 })
    expect(result.finalBalance).toBe(result.totalInvested)
    expect(result.totalInvested).toBeCloseTo(7.3, 10)
    expect(result.totalInterest).toBe(0)
  })
})

describe('calculateCompoundGrowth — no contributions', () => {
  it('compounds a lump sum annually (1000 € at 5% for 10 years)', () => {
    const result = growth({ contribution: 0, compounding: 'annual' })
    expect(result.finalBalance).toBeCloseTo(1628.894626777442, 6)
    expect(result.totalInvested).toBe(1000)
    expect(result.totalInterest).toBeCloseTo(628.894626777442, 6)
  })

  it('compounds a lump sum monthly (1000 € at 12% for 1 year)', () => {
    const result = growth({ contribution: 0, annualRatePercent: 12, years: 1 })
    expect(result.finalBalance).toBeCloseTo(1126.8250301319698, 6)
    expect(result.totalInterest).toBeCloseTo(126.8250301319698, 6)
  })

  it('compounds a lump sum quarterly', () => {
    const result = growth({ initialInvestment: 2000, contribution: 0, annualRatePercent: 8, years: 3, compounding: 'quarterly' })
    expect(result.finalBalance).toBeCloseTo(lumpSum(2000, 8, 4, 3), 6)
  })

  it('compounds a lump sum semi-annually (1000 € at 6% for 2 years)', () => {
    const result = growth({ contribution: 0, annualRatePercent: 6, years: 2, compounding: 'semiannual' })
    expect(result.finalBalance).toBeCloseTo(1125.50881, 6)
  })
})

describe('calculateCompoundGrowth — contributions (checked against closed-form formulas)', () => {
  it('matches the annuity formula for monthly contributions (100 €/month at 6% for 10 years)', () => {
    const result = growth({ initialInvestment: 0, annualRatePercent: 6 })
    expect(result.finalBalance).toBeCloseTo(annuity(100, 0.06 / 12, 120), 6)
    expect(result.finalBalance).toBeCloseTo(16387.93, 1)
  })

  it('combines the initial investment and monthly contributions', () => {
    const result = growth()
    expect(result.finalBalance).toBeCloseTo(lumpSum(1000, 5, 12, 10) + annuity(100, 0.05 / 12, 120), 6)
  })

  it('handles yearly contributions with annual compounding', () => {
    const result = growth({ contribution: 1200, contributionFrequency: 'yearly', annualRatePercent: 4, years: 20, compounding: 'annual' })
    expect(result.finalBalance).toBeCloseTo(lumpSum(1000, 4, 1, 20) + annuity(1200, 0.04, 20), 6)
  })

  it('handles yearly contributions with monthly compounding', () => {
    const result = growth({
      initialInvestment: 0,
      contribution: 1200,
      contributionFrequency: 'yearly',
      annualRatePercent: 6,
      years: 5,
    })
    const effectiveAnnual = Math.pow(1 + 0.06 / 12, 12) - 1
    expect(result.finalBalance).toBeCloseTo(annuity(1200, effectiveAnnual, 5), 6)
  })

  it('handles monthly contributions with annual compounding', () => {
    const result = growth({ initialInvestment: 0, annualRatePercent: 6, years: 1, compounding: 'annual' })
    const monthlyGrowth = Math.pow(1.06, 1 / 12)
    expect(result.finalBalance).toBeCloseTo(annuity(100, monthlyGrowth - 1, 12), 6)
  })

  it('handles monthly contributions with quarterly compounding', () => {
    const result = growth({
      initialInvestment: 500,
      contribution: 50,
      annualRatePercent: 4,
      years: 5,
      compounding: 'quarterly',
    })
    const monthlyGrowth = Math.pow(1.01, 4 / 12)
    expect(result.finalBalance).toBeCloseTo(500 * Math.pow(monthlyGrowth, 60) + annuity(50, monthlyGrowth - 1, 60), 6)
  })
})

describe('calculateCompoundGrowth — totals and breakdown', () => {
  it('counts 12 contributions per year when they are monthly', () => {
    expect(growth({ contribution: 100, years: 5 }).totalInvested).toBe(7000)
  })

  it('counts one contribution per year when they are yearly', () => {
    expect(growth({ contribution: 250, contributionFrequency: 'yearly', years: 4 }).totalInvested).toBe(2000)
  })

  it('reports interest as final balance minus total invested', () => {
    const result = growth()
    expect(result.totalInterest).toBeCloseTo(result.finalBalance - result.totalInvested, 8)
    expect(result.totalInterest).toBeGreaterThan(0)
  })

  it('splits the final balance into principal and interest shares that add up to 100%', () => {
    const result = growth()
    expect(result.principalPercent).toBeCloseTo((result.totalInvested / result.finalBalance) * 100, 10)
    expect(result.principalPercent + result.interestPercent).toBeCloseTo(100, 10)
    expect(result.principalPercent).toBeGreaterThan(0)
    expect(result.interestPercent).toBeGreaterThan(0)
  })

  it('returns zeros when nothing is invested', () => {
    const result = growth({ initialInvestment: 0, contribution: 0 })
    expect(result.finalBalance).toBe(0)
    expect(result.totalInvested).toBe(0)
    expect(result.totalInterest).toBe(0)
    expect(result.principalPercent).toBe(0)
    expect(result.interestPercent).toBe(0)
    expect(result.schedule.every((point) => point.balance === 0 && point.invested === 0)).toBe(true)
  })
})

describe('calculateCompoundGrowth — effective annual rate', () => {
  it('is 0% when the rate is 0%', () => {
    expect(growth({ annualRatePercent: 0 }).effectiveAnnualRatePercent).toBe(0)
  })

  it('equals the nominal rate with annual compounding', () => {
    expect(growth({ annualRatePercent: 5, compounding: 'annual' }).effectiveAnnualRatePercent).toBeCloseTo(5, 10)
  })

  it('is about 12.6825% for 12% compounded monthly', () => {
    expect(growth({ annualRatePercent: 12 }).effectiveAnnualRatePercent).toBeCloseTo(12.6825030132, 8)
  })

  it('is about 8.2432% for 8% compounded quarterly', () => {
    expect(growth({ annualRatePercent: 8, compounding: 'quarterly' }).effectiveAnnualRatePercent).toBeCloseTo(8.243216, 6)
  })

  it('is 10.25% for 10% compounded semi-annually', () => {
    expect(growth({ annualRatePercent: 10, compounding: 'semiannual' }).effectiveAnnualRatePercent).toBeCloseTo(10.25, 10)
  })

  it('grows with the compounding frequency for the same nominal rate', () => {
    const rates = (['annual', 'semiannual', 'quarterly', 'monthly'] as const).map(
      (compounding) => growth({ annualRatePercent: 8, compounding }).effectiveAnnualRatePercent,
    )
    expect(rates[0]).toBeLessThan(rates[1] ?? 0)
    expect(rates[1]).toBeLessThan(rates[2] ?? 0)
    expect(rates[2]).toBeLessThan(rates[3] ?? 0)
  })

  it('does not depend on duration or contributions', () => {
    const a = growth({ years: 1, contribution: 0 })
    const b = growth({ years: 30, contribution: 500 })
    expect(a.effectiveAnnualRatePercent).toBe(b.effectiveAnnualRatePercent)
  })
})

describe('calculateCompoundGrowth — year-by-year schedule', () => {
  it('has one point per year, from year 0 to the last year', () => {
    const { schedule } = growth({ years: 7 })
    expect(schedule).toHaveLength(8)
    expect(schedule.map((point) => point.year)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('starts from the initial investment', () => {
    const [first] = growth().schedule
    expect(first).toEqual({ year: 0, invested: 1000, balance: 1000, interest: 0 })
  })

  it('tracks the amount invested at each year end', () => {
    const { schedule } = growth({ initialInvestment: 1000, contribution: 100, years: 3 })
    expect(schedule.map((point) => point.invested)).toEqual([1000, 2200, 3400, 4600])

    const yearly = growth({ initialInvestment: 1000, contribution: 250, contributionFrequency: 'yearly', years: 3 })
    expect(yearly.schedule.map((point) => point.invested)).toEqual([1000, 1250, 1500, 1750])
  })

  it('ends on the reported totals', () => {
    const result = growth()
    const last = result.schedule[result.schedule.length - 1]
    expect(last).toMatchObject({
      year: 10,
      invested: result.totalInvested,
      balance: result.finalBalance,
      interest: result.totalInterest,
    })
  })

  it('never decreases, and never reports negative interest', () => {
    const { schedule } = growth({ years: 30, annualRatePercent: 3.5 })
    for (let i = 1; i < schedule.length; i += 1) {
      const previous = schedule[i - 1]
      const current = schedule[i]
      expect(current?.balance).toBeGreaterThanOrEqual(previous?.balance ?? 0)
      expect(current?.invested).toBeGreaterThanOrEqual(previous?.invested ?? 0)
      expect(current?.interest).toBeGreaterThanOrEqual(0)
    }
  })

  it('matches the closed-form balance after the first year', () => {
    const { schedule } = growth({ contribution: 0, annualRatePercent: 12, years: 3 })
    expect(schedule[1]?.balance).toBeCloseTo(lumpSum(1000, 12, 12, 1), 8)
  })

  it('supports the shortest and the longest durations', () => {
    expect(growth({ years: 1 }).schedule).toHaveLength(2)
    expect(growth({ years: MAX_YEARS }).schedule).toHaveLength(MAX_YEARS + 1)
  })
})

describe('calculateCompoundGrowth — floating-point behaviour', () => {
  it('never reports negative interest for a vanishingly small rate', () => {
    const result = growth({ annualRatePercent: 1e-12 })
    expect(result.totalInterest).toBeGreaterThanOrEqual(0)
    expect(result.finalBalance).toBeGreaterThanOrEqual(result.totalInvested)
  })

  it('stays finite for large balances over a long time', () => {
    const result = growth({ initialInvestment: 1e9, contribution: 1e6, annualRatePercent: 7, years: 50 })
    expect(Number.isFinite(result.finalBalance)).toBe(true)
    expect(result.finalBalance).toBeGreaterThan(result.totalInvested)
  })
})

describe('calculateCompoundGrowth — validation', () => {
  it.each<[Partial<CompoundInterestInput>, CompoundInterestErrorCode]>([
    // non-finite values
    [{ initialInvestment: NaN }, 'invalidNumber'],
    [{ initialInvestment: Infinity }, 'invalidNumber'],
    [{ contribution: NaN }, 'invalidNumber'],
    [{ contribution: -Infinity }, 'invalidNumber'],
    [{ annualRatePercent: NaN }, 'invalidNumber'],
    [{ annualRatePercent: Infinity }, 'invalidNumber'],
    [{ years: NaN }, 'invalidNumber'],
    [{ years: Infinity }, 'invalidNumber'],
    // negative amounts and rates
    [{ initialInvestment: -1 }, 'initialNegative'],
    [{ initialInvestment: -0.01 }, 'initialNegative'],
    [{ contribution: -1 }, 'contributionNegative'],
    [{ contribution: -0.01 }, 'contributionNegative'],
    [{ annualRatePercent: -1 }, 'rateNegative'],
    [{ annualRatePercent: -0.01 }, 'rateNegative'],
    [{ annualRatePercent: -100 }, 'rateNegative'],
    // duration: whole years from 1 to 100
    [{ years: 0 }, 'yearsInvalid'],
    [{ years: -1 }, 'yearsInvalid'],
    [{ years: 0.5 }, 'yearsInvalid'],
    [{ years: 1.5 }, 'yearsInvalid'],
    [{ years: 101 }, 'yearsInvalid'],
    [{ years: 1000 }, 'yearsInvalid'],
    // frequencies
    [{ contributionFrequency: 'weekly' as never }, 'frequencyInvalid'],
    [{ compounding: 'daily' as never }, 'frequencyInvalid'],
    [{ compounding: 'constructor' as never }, 'frequencyInvalid'],
    // overflow
    [{ annualRatePercent: 1e6, years: 100 }, 'resultOverflow'],
    [{ contribution: 1e308, annualRatePercent: 0, years: 10 }, 'resultOverflow'],
    [{ initialInvestment: 1e308, annualRatePercent: 100, years: 10 }, 'resultOverflow'],
  ])('%j → %s', (overrides, code) => {
    expect(calculateCompoundGrowth(input(overrides))).toMatchObject({ status: 'error', code })
  })

  it('reports non-finite values before negative ones', () => {
    expect(calculateCompoundGrowth(input({ initialInvestment: NaN, annualRatePercent: -5 }))).toMatchObject({
      code: 'invalidNumber',
    })
  })

  it('reports a negative capital before a negative contribution', () => {
    expect(calculateCompoundGrowth(input({ initialInvestment: -1, contribution: -1 }))).toMatchObject({
      code: 'initialNegative',
    })
  })

  it('reports a negative rate before an invalid duration', () => {
    expect(calculateCompoundGrowth(input({ annualRatePercent: -1, years: 0 }))).toMatchObject({
      code: 'rateNegative',
    })
  })

  it('reports an invalid duration before an invalid frequency', () => {
    expect(calculateCompoundGrowth(input({ years: 0, compounding: 'daily' as never }))).toMatchObject({
      code: 'yearsInvalid',
    })
  })

  it('includes a non-empty message on errors', () => {
    const result = calculateCompoundGrowth(input({ years: 0 }))
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('never throws on bad input', () => {
    expect(() =>
      calculateCompoundGrowth({
        initialInvestment: NaN,
        contribution: NaN,
        contributionFrequency: 'weekly' as never,
        annualRatePercent: NaN,
        years: NaN,
        compounding: 'daily' as never,
      }),
    ).not.toThrow()
  })

  it('normalizes negative-zero amounts to zero', () => {
    const result = growth({ initialInvestment: -0, contribution: -0 })
    expect(result.finalBalance).toBe(0)
    expect(result.totalInvested).toBe(0)
  })

  it('normalizes a negative-zero rate to zero', () => {
    const result = growth({ annualRatePercent: -0 })
    expect(result.effectiveAnnualRatePercent).toBe(0)
    expect(result.totalInterest).toBe(0)
  })
})

describe('calculateCompoundGrowth — Portuguese decimal input (parseLocaleNumber)', () => {
  function parsed(raw: string): number {
    const value = parseLocaleNumber(raw)
    if (value === null) throw new Error(`Could not parse ${raw}`)
    return value
  }

  it('handles comma decimals', () => {
    const result = growth({
      initialInvestment: parsed('1500,50'),
      contribution: parsed('100,25'),
      annualRatePercent: parsed('3,5'),
      years: parsed('10'),
    })
    const expected = lumpSum(1500.5, 3.5, 12, 10) + annuity(100.25, 0.035 / 12, 120)
    expect(result.finalBalance).toBeCloseTo(expected, 6)
    expect(result.totalInvested).toBeCloseTo(1500.5 + 100.25 * 120, 8)
  })

  it('accepts a dot decimal separator too', () => {
    const result = growth({
      initialInvestment: parsed('1500.50'),
      contribution: parsed('100.25'),
      annualRatePercent: parsed('3.5'),
    })
    expect(result.finalBalance).toBeCloseTo(lumpSum(1500.5, 3.5, 12, 10) + annuity(100.25, 0.035 / 12, 120), 6)
  })

  it('leaves unparseable text for the UI to reject before calculating', () => {
    expect(parseLocaleNumber('abc')).toBeNull()
    expect(parseLocaleNumber('')).toBeNull()
  })
})

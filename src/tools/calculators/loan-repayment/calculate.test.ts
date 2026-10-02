import { describe, expect, it } from 'vitest'
import { parseLocaleNumber } from '../../../lib/validation'
import { MAX_RATE_PERCENT, MAX_TERM_MONTHS, calculateLoan } from './calculate'
import type { LoanErrorCode, LoanInput, LoanResult } from './calculate'

type LoanOk = Extract<LoanResult, { status: 'ok' }>

const BASE: LoanInput = {
  loanAmount: 100000,
  annualRatePercent: 6,
  term: 30,
  termUnit: 'years',
  downPayment: 0,
  extraMonthlyPayment: 0,
}

function input(overrides: Partial<LoanInput> = {}): LoanInput {
  return { ...BASE, ...overrides }
}

function loan(overrides: Partial<LoanInput> = {}): LoanOk {
  const result = calculateLoan(input(overrides))
  if (result.status !== 'ok') {
    throw new Error(`Expected an ok result, got ${result.code}`)
  }
  return result
}

/** Independent closed-form annuity instalment: P × i / (1 − (1 + i)^−n). */
function annuity(principal: number, annualRatePercent: number, months: number): number {
  const i = annualRatePercent / 100 / 12
  if (i === 0) return principal / months
  return (principal * i) / (1 - Math.pow(1 + i, -months))
}

describe('constants', () => {
  it('limits the term to 50 years and the rate to 100%', () => {
    expect(MAX_TERM_MONTHS).toBe(600)
    expect(MAX_RATE_PERCENT).toBe(100)
  })
})

describe('calculateLoan — standard annuity', () => {
  it('matches the well-known figures for 100 000 € at 6% over 30 years', () => {
    const result = loan()
    expect(result.monthlyInstalment).toBeCloseTo(599.55, 2)
    expect(result.totalInterest).toBeCloseTo(115838.19, 1)
    expect(result.totalRepaid).toBeCloseTo(215838.19, 1)
    expect(result.termMonths).toBe(360)
    expect(result.payoffMonths).toBe(360)
    expect(result.schedule).toHaveLength(360)
  })

  it('matches the well-known figure for 12 000 € at 12% over 1 year', () => {
    expect(loan({ loanAmount: 12000, annualRatePercent: 12, term: 1 }).monthlyInstalment).toBeCloseTo(1066.19, 1)
  })

  it.each<[number, number, number, 'years' | 'months']>([
    [150000, 3.5, 25, 'years'],
    [20000, 7.9, 60, 'months'],
    [5000, 15, 18, 'months'],
    [300000, 2.25, 40, 'years'],
  ])('matches the closed-form formula for %d € at %d%% over %d %s', (amount, rate, term, unit) => {
    const months = unit === 'years' ? term * 12 : term
    const result = loan({ loanAmount: amount, annualRatePercent: rate, term, termUnit: unit })
    expect(result.monthlyInstalment).toBeCloseTo(annuity(amount, rate, months), 6)
    expect(result.totalInterest).toBeCloseTo(annuity(amount, rate, months) * months - amount, 4)
  })

  it('treats 10 years and 120 months identically', () => {
    expect(loan({ term: 10, termUnit: 'years' })).toEqual(loan({ term: 120, termUnit: 'months' }))
  })

  it('has total repaid equal to financed amount + interest, and to instalment × months', () => {
    const result = loan()
    expect(result.totalRepaid).toBeCloseTo(result.financedAmount + result.totalInterest, 8)
    expect(result.totalRepaid).toBeCloseTo(result.monthlyInstalment * 360, 4)
  })

  it('reports no additional repayment, saving or shortening by default', () => {
    const result = loan()
    expect(result.hasExtra).toBe(false)
    expect(result.monthlyPaymentWithExtra).toBe(result.monthlyInstalment)
    expect(result.interestSaved).toBe(0)
    expect(result.monthsSaved).toBe(0)
    expect(result.baselineTotalInterest).toBe(result.totalInterest)
  })
})

describe('calculateLoan — zero interest', () => {
  it('splits the amount evenly (12 000 € over 2 years)', () => {
    const result = loan({ loanAmount: 12000, annualRatePercent: 0, term: 2 })
    expect(result.monthlyInstalment).toBe(500)
    expect(result.totalInterest).toBe(0)
    expect(result.totalRepaid).toBe(12000)
    expect(result.schedule).toHaveLength(24)
    expect(result.schedule.every((row) => row.principal === 500 && row.interest === 0)).toBe(true)
  })

  it('pays off sooner with an additional repayment and saves no interest', () => {
    const result = loan({ loanAmount: 12000, annualRatePercent: 0, term: 2, extraMonthlyPayment: 500 })
    expect(result.payoffMonths).toBe(12)
    expect(result.monthsSaved).toBe(12)
    expect(result.interestSaved).toBe(0)
  })

  it('clears an amount that does not divide evenly', () => {
    const result = loan({ loanAmount: 1000, annualRatePercent: 0, term: 3, termUnit: 'months' })
    const last = result.schedule[result.schedule.length - 1]
    expect(result.schedule).toHaveLength(3)
    expect(last?.endBalance).toBe(0)
    expect(result.schedule.reduce((sum, row) => sum + row.principal, 0)).toBeCloseTo(1000, 8)
  })
})

describe('calculateLoan — down payment', () => {
  it('reduces the financed amount and keeps the down payment separate', () => {
    const result = loan({ loanAmount: 200000, downPayment: 50000, annualRatePercent: 5, term: 20 })
    expect(result.financedAmount).toBe(150000)
    expect(result.downPayment).toBe(50000)
    expect(result.totalRepaid).toBeCloseTo(150000 + result.totalInterest, 6)
  })

  it('gives the same result as borrowing the reduced amount directly', () => {
    const withDown = loan({ loanAmount: 200000, downPayment: 50000, annualRatePercent: 5, term: 20 })
    const direct = loan({ loanAmount: 150000, annualRatePercent: 5, term: 20 })
    expect(withDown.monthlyInstalment).toBe(direct.monthlyInstalment)
    expect(withDown.totalInterest).toBe(direct.totalInterest)
  })
})

describe('calculateLoan — additional monthly repayment', () => {
  it('shortens the loan to the duration given by the constant-payment formula', () => {
    const result = loan({ extraMonthlyPayment: 200 })
    const payment = result.monthlyInstalment + 200
    const i = 0.06 / 12
    const expectedMonths = Math.ceil(-Math.log(1 - (100000 * i) / payment) / Math.log(1 + i))
    expect(result.payoffMonths).toBe(expectedMonths)
    expect(result.payoffMonths).toBeLessThan(360)
    expect(result.monthsSaved).toBe(360 - expectedMonths)
    expect(result.schedule).toHaveLength(expectedMonths)
  })

  it('saves interest equal to the difference with the contractual schedule', () => {
    const plain = loan()
    const withExtra = loan({ extraMonthlyPayment: 200 })
    expect(withExtra.baselineTotalInterest).toBe(plain.totalInterest)
    expect(withExtra.interestSaved).toBeCloseTo(plain.totalInterest - withExtra.totalInterest, 8)
    expect(withExtra.interestSaved).toBeGreaterThan(0)
    expect(withExtra.totalInterest).toBeLessThan(plain.totalInterest)
  })

  it('keeps the contractual instalment separate from the payment including the extra', () => {
    const plain = loan()
    const withExtra = loan({ extraMonthlyPayment: 200 })
    expect(withExtra.hasExtra).toBe(true)
    expect(withExtra.monthlyInstalment).toBe(plain.monthlyInstalment)
    expect(withExtra.monthlyPaymentWithExtra).toBe(plain.monthlyInstalment + 200)
  })

  it('caps the additional repayment at the remaining balance', () => {
    const result = loan({ loanAmount: 1000, annualRatePercent: 5, term: 12, termUnit: 'months', extraMonthlyPayment: 5000 })
    const [first] = result.schedule
    expect(result.payoffMonths).toBe(1)
    expect(result.schedule).toHaveLength(1)
    expect(result.monthsSaved).toBe(11)
    expect(first?.endBalance).toBe(0)
    expect(first?.additional).toBeCloseTo(1000 - (first?.principal ?? 0), 8)
    expect(result.totalInterest).toBeCloseTo((1000 * 0.05) / 12, 8)
  })

  it('shortens the loan more and saves more interest as the extra grows', () => {
    const results = [0, 100, 300, 1000].map((extra) => loan({ extraMonthlyPayment: extra }))
    for (let i = 1; i < results.length; i += 1) {
      const previous = results[i - 1]
      const current = results[i]
      expect(current?.payoffMonths).toBeLessThan(previous?.payoffMonths ?? 0)
      expect(current?.interestSaved).toBeGreaterThan(previous?.interestSaved ?? 0)
    }
  })

  it('has nothing to shorten on a one-month loan', () => {
    const result = loan({ loanAmount: 1000, annualRatePercent: 12, term: 1, termUnit: 'months', extraMonthlyPayment: 100 })
    expect(result.hasExtra).toBe(true)
    expect(result.payoffMonths).toBe(1)
    expect(result.monthsSaved).toBe(0)
    expect(result.interestSaved).toBe(0)
    expect(result.monthlyInstalment).toBeCloseTo(1010, 8)
  })
})

describe('calculateLoan — amortisation schedule invariants', () => {
  const scenarios: Partial<LoanInput>[] = [
    {},
    { extraMonthlyPayment: 200 },
    { annualRatePercent: 0 },
    { annualRatePercent: 0, extraMonthlyPayment: 100 },
    { downPayment: 20000 },
    { term: 1, termUnit: 'months' },
    { extraMonthlyPayment: 1e6 },
    { term: 18, termUnit: 'months', annualRatePercent: 9.75, extraMonthlyPayment: 33.33 },
  ]

  function forEachScenario(check: (result: LoanOk, merged: LoanInput) => void) {
    for (const overrides of scenarios) {
      check(loan(overrides), input(overrides))
    }
  }

  it('starts from the financed amount', () => {
    forEachScenario((result) => {
      expect(result.schedule[0]?.startBalance).toBe(result.financedAmount)
    })
  })

  it('chains each month to the next and computes interest on the starting balance', () => {
    forEachScenario((result, merged) => {
      const monthlyRate = merged.annualRatePercent / 100 / 12
      let previousEnd: number | null = null
      for (const row of result.schedule) {
        if (previousEnd !== null) expect(row.startBalance).toBe(previousEnd)
        expect(row.endBalance).toBe(row.startBalance - row.principal - row.additional)
        expect(row.interest).toBeCloseTo(row.startBalance * monthlyRate, 10)
        previousEnd = row.endBalance
      }
    })
  })

  it('never goes negative and ends at exactly zero', () => {
    forEachScenario((result) => {
      for (const row of result.schedule) {
        expect(row.startBalance).toBeGreaterThan(0)
        expect(row.endBalance).toBeGreaterThanOrEqual(0)
        expect(row.principal).toBeGreaterThanOrEqual(0)
        expect(row.interest).toBeGreaterThanOrEqual(0)
        expect(row.additional).toBeGreaterThanOrEqual(0)
      }
      expect(result.schedule[result.schedule.length - 1]?.endBalance).toBe(0)
    })
  })

  it('repays exactly the financed amount and sums the interest into the total', () => {
    forEachScenario((result) => {
      const repaid = result.schedule.reduce((sum, row) => sum + row.principal + row.additional, 0)
      const interest = result.schedule.reduce((sum, row) => sum + row.interest, 0)
      expect(repaid).toBeCloseTo(result.financedAmount, 6)
      expect(interest).toBeCloseTo(result.totalInterest, 8)
    })
  })

  it('never pays more than the remaining balance plus interest in any month', () => {
    forEachScenario((result) => {
      for (const row of result.schedule) {
        const tolerance = 1e-9 * Math.max(1, row.startBalance)
        expect(row.principal + row.additional).toBeLessThanOrEqual(row.startBalance + tolerance)
        expect(row.principal + row.interest + row.additional).toBeLessThanOrEqual(
          row.startBalance + row.interest + tolerance,
        )
      }
      const last = result.schedule[result.schedule.length - 1]
      expect((last?.principal ?? 0) + (last?.additional ?? 0)).toBeCloseTo(last?.startBalance ?? 0, 8)
    })
  })

  it('pays principal + interest equal to the instalment every month of the contractual schedule', () => {
    for (const overrides of [{}, { annualRatePercent: 0 }, { downPayment: 20000 }, { term: 18, termUnit: 'months' as const }]) {
      const result = loan(overrides)
      for (const row of result.schedule) {
        expect(row.additional).toBe(0)
        expect(row.principal + row.interest).toBeCloseTo(result.monthlyInstalment, 4)
      }
    }
  })

  it('numbers the months consecutively from 1', () => {
    forEachScenario((result) => {
      expect(result.schedule.map((row) => row.month)).toEqual(result.schedule.map((_row, index) => index + 1))
    })
  })

  it('has one row per month until payoff, never more than the term', () => {
    forEachScenario((result) => {
      expect(result.schedule).toHaveLength(result.payoffMonths)
      expect(result.payoffMonths).toBeLessThanOrEqual(result.termMonths)
      expect(result.monthsSaved).toBe(result.termMonths - result.payoffMonths)
    })
  })

  it('supports the longest term in years (50 years)', () => {
    const result = loan({ annualRatePercent: 5, term: 50, termUnit: 'years' })
    expect(result.termMonths).toBe(600)
    expect(result.schedule).toHaveLength(600)
  })

  it('supports the longest term in months (600 months)', () => {
    const result = loan({ annualRatePercent: 5, term: 600, termUnit: 'months' })
    expect(result.schedule).toHaveLength(600)
  })

  it('supports the shortest terms', () => {
    expect(loan({ term: 1, termUnit: 'months' }).schedule).toHaveLength(1)
    expect(loan({ term: 12, termUnit: 'months' }).schedule).toHaveLength(12)
    expect(loan({ term: 1, termUnit: 'years' }).schedule).toHaveLength(12)
  })
})

describe('calculateLoan — floating-point behaviour', () => {
  it('stays accurate for a vanishingly small rate', () => {
    const result = loan({ annualRatePercent: 1e-9 })
    expect(result.monthlyInstalment).toBeCloseTo(100000 / 360, 4)
    expect(Number.isFinite(result.totalInterest)).toBe(true)
    expect(result.totalInterest).toBeGreaterThanOrEqual(0)
  })

  it('never produces a negative balance or a non-zero final balance across many parameter combinations', () => {
    for (const annualRatePercent of [0, 0.01, 5, 20, 100]) {
      for (const term of [1, 2, 12, 360]) {
        for (const extraMonthlyPayment of [0, 0.01, 123.45, 1e6]) {
          const result = loan({ loanAmount: 50000, annualRatePercent, term, termUnit: 'months', extraMonthlyPayment })
          for (const row of result.schedule) {
            expect(Number.isFinite(row.endBalance)).toBe(true)
            expect(row.endBalance).toBeGreaterThanOrEqual(0)
            expect(row.principal).toBeGreaterThanOrEqual(0)
          }
          expect(result.schedule[result.schedule.length - 1]?.endBalance).toBe(0)
        }
      }
    }
  })

  it('stays finite at the highest accepted rate over a long term', () => {
    const result = loan({ annualRatePercent: 100 })
    expect(Number.isFinite(result.monthlyInstalment)).toBe(true)
    expect(Number.isFinite(result.totalInterest)).toBe(true)
    expect(result.schedule[result.schedule.length - 1]?.endBalance).toBe(0)
  })

  it('handles large loan amounts', () => {
    const result = loan({ loanAmount: 5e8, annualRatePercent: 6, term: 40 })
    expect(Number.isFinite(result.totalRepaid)).toBe(true)
    expect(result.monthlyInstalment).toBeCloseTo(annuity(5e8, 6, 480), 2)
  })
})

describe('calculateLoan — validation', () => {
  it.each<[Partial<LoanInput>, LoanErrorCode]>([
    // non-finite values
    [{ loanAmount: NaN }, 'invalidNumber'],
    [{ loanAmount: Infinity }, 'invalidNumber'],
    [{ annualRatePercent: NaN }, 'invalidNumber'],
    [{ annualRatePercent: Infinity }, 'invalidNumber'],
    [{ term: NaN }, 'invalidNumber'],
    [{ term: Infinity }, 'invalidNumber'],
    [{ downPayment: NaN }, 'invalidNumber'],
    [{ downPayment: -Infinity }, 'invalidNumber'],
    [{ extraMonthlyPayment: NaN }, 'invalidNumber'],
    [{ extraMonthlyPayment: Infinity }, 'invalidNumber'],
    // loan amount must be positive
    [{ loanAmount: 0 }, 'amountNotPositive'],
    [{ loanAmount: -1 }, 'amountNotPositive'],
    [{ loanAmount: -0.01 }, 'amountNotPositive'],
    // down payment
    [{ downPayment: -1 }, 'downPaymentNegative'],
    [{ downPayment: -0.01 }, 'downPaymentNegative'],
    [{ downPayment: 100000 }, 'downPaymentTooHigh'],
    [{ downPayment: 100001 }, 'downPaymentTooHigh'],
    // rate between 0 and 100
    [{ annualRatePercent: -1 }, 'rateOutOfRange'],
    [{ annualRatePercent: -0.01 }, 'rateOutOfRange'],
    [{ annualRatePercent: 100.01 }, 'rateOutOfRange'],
    [{ annualRatePercent: 150 }, 'rateOutOfRange'],
    // term: whole number, 1 month to 50 years
    [{ term: 0 }, 'termInvalid'],
    [{ term: -1 }, 'termInvalid'],
    [{ term: 1.5 }, 'termInvalid'],
    [{ term: 0.5 }, 'termInvalid'],
    [{ term: 51, termUnit: 'years' }, 'termInvalid'],
    [{ term: 601, termUnit: 'months' }, 'termInvalid'],
    [{ term: 0, termUnit: 'months' }, 'termInvalid'],
    [{ term: 12.5, termUnit: 'months' }, 'termInvalid'],
    [{ termUnit: 'weeks' as never }, 'termInvalid'],
    // additional repayment
    [{ extraMonthlyPayment: -1 }, 'extraNegative'],
    [{ extraMonthlyPayment: -0.01 }, 'extraNegative'],
    // overflow
    [{ loanAmount: 1e308, annualRatePercent: 100 }, 'resultOverflow'],
  ])('%j → %s', (overrides, code) => {
    expect(calculateLoan(input(overrides))).toMatchObject({ status: 'error', code })
  })

  it('reports non-finite values before range errors', () => {
    expect(calculateLoan(input({ annualRatePercent: NaN, loanAmount: 0 }))).toMatchObject({ code: 'invalidNumber' })
  })

  it('reports a non-positive amount before a down payment error', () => {
    expect(calculateLoan(input({ loanAmount: 0, downPayment: -1 }))).toMatchObject({ code: 'amountNotPositive' })
  })

  it('reports a too-high down payment before an invalid rate', () => {
    expect(calculateLoan(input({ downPayment: 100000, annualRatePercent: 150 }))).toMatchObject({
      code: 'downPaymentTooHigh',
    })
  })

  it('reports an invalid rate before an invalid term', () => {
    expect(calculateLoan(input({ annualRatePercent: -1, term: 0 }))).toMatchObject({ code: 'rateOutOfRange' })
  })

  it('reports an invalid term before a negative additional repayment', () => {
    expect(calculateLoan(input({ term: 0, extraMonthlyPayment: -1 }))).toMatchObject({ code: 'termInvalid' })
  })

  it('includes a non-empty message on errors', () => {
    const result = calculateLoan(input({ term: 0 }))
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('never throws on bad input', () => {
    expect(() =>
      calculateLoan({
        loanAmount: NaN,
        annualRatePercent: NaN,
        term: NaN,
        termUnit: 'weeks' as never,
        downPayment: NaN,
        extraMonthlyPayment: NaN,
      }),
    ).not.toThrow()
    expect(() => calculateLoan(input({ loanAmount: -1, downPayment: -1, term: -1, extraMonthlyPayment: -1 }))).not.toThrow()
  })

  it('treats a negative-zero rate exactly like zero', () => {
    expect(loan({ annualRatePercent: -0 })).toEqual(loan({ annualRatePercent: 0 }))
  })

  it('normalizes negative-zero optional amounts to zero', () => {
    const result = loan({ downPayment: -0, extraMonthlyPayment: -0 })
    expect(result.downPayment).toBe(0)
    expect(result.hasExtra).toBe(false)
    expect(result.monthlyPaymentWithExtra).toBe(result.monthlyInstalment)
  })
})

describe('calculateLoan — Portuguese decimal input (parseLocaleNumber)', () => {
  function parsed(raw: string): number {
    const value = parseLocaleNumber(raw)
    if (value === null) throw new Error(`Could not parse ${raw}`)
    return value
  }

  it('handles comma decimals', () => {
    const result = loan({
      loanAmount: parsed('150000'),
      annualRatePercent: parsed('3,5'),
      term: parsed('25'),
      downPayment: parsed('10000'),
      extraMonthlyPayment: parsed('150,50'),
    })
    expect(result.financedAmount).toBe(140000)
    expect(result.monthlyInstalment).toBeCloseTo(annuity(140000, 3.5, 300), 6)
    expect(result.monthlyPaymentWithExtra).toBeCloseTo(annuity(140000, 3.5, 300) + 150.5, 6)
  })

  it('accepts a dot decimal separator too', () => {
    const result = loan({ annualRatePercent: parsed('3.5'), extraMonthlyPayment: parsed('150.50') })
    expect(result.monthlyPaymentWithExtra).toBeCloseTo(annuity(100000, 3.5, 360) + 150.5, 6)
  })

  it('leaves unparseable text for the UI to reject before calculating', () => {
    expect(parseLocaleNumber('abc')).toBeNull()
    expect(parseLocaleNumber('')).toBeNull()
  })
})

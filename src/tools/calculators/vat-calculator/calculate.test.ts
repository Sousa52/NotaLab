import { describe, expect, it } from 'vitest'
import { parseLocaleNumber } from '../../../lib/validation'
import { VAT_RATES, addVat, removeVat } from './calculate'
import type { VatErrorCode, VatResult } from './calculate'

type VatOk = Extract<VatResult, { status: 'ok' }>

function expectOk(result: VatResult): VatOk {
  if (result.status !== 'ok') {
    throw new Error(`Expected an ok result, got ${result.code}`)
  }
  return result
}

const add = (amount: number, rate: number) => expectOk(addVat(amount, rate))
const remove = (amount: number, rate: number) => expectOk(removeVat(amount, rate))

describe('VAT_RATES', () => {
  it('holds the mainland Portugal rates', () => {
    expect(VAT_RATES).toEqual({ reduced: 6, intermediate: 13, normal: 23 })
  })
})

describe('addVat — standard rates', () => {
  it.each([
    [100, 6, 6, 106],
    [100, 13, 13, 113],
    [100, 23, 23, 123],
  ])('%d at %d%% → IVA %d, total %d', (net, rate, vat, gross) => {
    expect(addVat(net, rate)).toEqual({
      status: 'ok',
      netAmount: net,
      vatAmount: vat,
      grossAmount: gross,
      ratePercent: rate,
    })
  })
})

describe('addVat — other amounts', () => {
  it.each([
    [50, 23, 11.5, 61.5],
    [1000, 23, 230, 1230],
  ])('%d at %d%%', (net, rate, vat, gross) => {
    const result = add(net, rate)
    expect(result.vatAmount).toBeCloseTo(vat, 10)
    expect(result.grossAmount).toBeCloseTo(gross, 10)
  })
})

describe('addVat — decimal amounts', () => {
  it.each([
    [19.99, 23, 4.5977, 24.5877],
    [0.01, 23, 0.0023, 0.0123],
    [1234.56, 23, 283.9488, 1518.5088],
    [0.1, 23, 0.023, 0.123],
  ])('%d at %d%%', (net, rate, vat, gross) => {
    const result = add(net, rate)
    expect(result.vatAmount).toBeCloseTo(vat, 10)
    expect(result.grossAmount).toBeCloseTo(gross, 10)
  })
})

describe('addVat — custom rates', () => {
  it.each([
    [200, 8.5, 17, 217],
    [100, 4, 4, 104],
    [80, 12.5, 10, 90],
    [100, 0.5, 0.5, 100.5],
    [100, 100, 100, 200],
    [100, 250, 250, 350],
    [100, 0, 0, 100],
  ])('%d at %d%%', (net, rate, vat, gross) => {
    const result = add(net, rate)
    expect(result.vatAmount).toBeCloseTo(vat, 10)
    expect(result.grossAmount).toBeCloseTo(gross, 10)
    expect(result.ratePercent).toBe(rate)
  })
})

describe('addVat — zero', () => {
  it('returns zeros for a zero amount', () => {
    expect(addVat(0, 23)).toEqual({
      status: 'ok',
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
      ratePercent: 23,
    })
  })

  it('leaves an awkward decimal untouched at a 0% rate', () => {
    const result = add(59.99, 0)
    expect(result.vatAmount).toBe(0)
    expect(result.grossAmount).toBe(59.99)
  })

  it('normalizes a negative-zero amount to zero', () => {
    expect(addVat(-0, 23)).toEqual({
      status: 'ok',
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
      ratePercent: 23,
    })
  })

  it('normalizes a negative-zero rate to zero', () => {
    const result = add(100, -0)
    expect(result.vatAmount).toBe(0)
    expect(result.ratePercent).toBe(0)
  })
})

describe('removeVat — standard rates', () => {
  it.each([
    [106, 6, 100, 6],
    [113, 13, 100, 13],
    [123, 23, 100, 23],
  ])('%d at %d%% → sem IVA %d, IVA %d', (gross, rate, net, vat) => {
    expect(removeVat(gross, rate)).toEqual({
      status: 'ok',
      netAmount: net,
      vatAmount: vat,
      grossAmount: gross,
      ratePercent: rate,
    })
  })
})

describe('removeVat — other amounts', () => {
  it.each([
    [61.5, 23, 50, 11.5],
    [1230, 23, 1000, 230],
  ])('%d at %d%%', (gross, rate, net, vat) => {
    const result = remove(gross, rate)
    expect(result.netAmount).toBeCloseTo(net, 10)
    expect(result.vatAmount).toBeCloseTo(vat, 10)
  })
})

describe('removeVat — decimal amounts', () => {
  it.each([
    [24.99, 23, 20.3170731707, 4.6729268293],
    [0.0123, 23, 0.01, 0.0023],
    [1518.5088, 23, 1234.56, 283.9488],
  ])('%d at %d%%', (gross, rate, net, vat) => {
    const result = remove(gross, rate)
    expect(result.netAmount).toBeCloseTo(net, 8)
    expect(result.vatAmount).toBeCloseTo(vat, 8)
  })
})

describe('removeVat — custom rates', () => {
  it.each([
    [217, 8.5, 200, 17],
    [100, 25, 80, 20],
    [150, 100, 75, 75],
    [100, 0, 100, 0],
  ])('%d at %d%%', (gross, rate, net, vat) => {
    const result = remove(gross, rate)
    expect(result.netAmount).toBeCloseTo(net, 10)
    expect(result.vatAmount).toBeCloseTo(vat, 10)
  })
})

describe('removeVat — zero', () => {
  it('returns zeros for a zero amount', () => {
    expect(removeVat(0, 23)).toEqual({
      status: 'ok',
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
      ratePercent: 23,
    })
  })

  it('leaves an awkward decimal untouched at a 0% rate', () => {
    const result = remove(59.99, 0)
    expect(result.netAmount).toBe(59.99)
    expect(result.vatAmount).toBe(0)
  })

  it('normalizes a negative-zero amount to zero', () => {
    expect(removeVat(-0, 23)).toEqual({
      status: 'ok',
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
      ratePercent: 23,
    })
  })

  it('never returns a negative IVA or a base above the total, even for a tiny rate', () => {
    const result = remove(1234.56, 1e-20)
    expect(result.vatAmount).toBeGreaterThanOrEqual(0)
    expect(result.netAmount).toBeLessThanOrEqual(1234.56)
  })
})

describe('separation of base amount, IVA and total', () => {
  const pairs: [number, number][] = [
    [100, 6],
    [19.99, 23],
    [1234.56, 13],
    [0.01, 23],
    [59.9, 8.5],
    [250, 0],
  ]

  it('addVat: base + IVA = total, with a non-negative IVA', () => {
    for (const [amount, rate] of pairs) {
      const result = add(amount, rate)
      expect(result.vatAmount).toBeGreaterThanOrEqual(0)
      expect(result.netAmount + result.vatAmount).toBeCloseTo(result.grossAmount, 8)
    }
  })

  it('removeVat: base + IVA = total, with a non-negative IVA', () => {
    for (const [amount, rate] of pairs) {
      const result = remove(amount, rate)
      expect(result.vatAmount).toBeGreaterThanOrEqual(0)
      expect(result.netAmount + result.vatAmount).toBeCloseTo(result.grossAmount, 8)
    }
  })

  it('addVat reports the input as the base amount', () => {
    expect(add(19.99, 23).netAmount).toBe(19.99)
  })

  it('removeVat reports the input as the total', () => {
    expect(remove(24.99, 23).grossAmount).toBe(24.99)
  })
})

describe('round trips', () => {
  const amounts = [100, 19.99, 1234.56, 0.01, 59.9, 250]
  const rates = [0, 6, 13, 23, 8.5]

  it('removing IVA from a total made by adding IVA recovers the base amount', () => {
    for (const amount of amounts) {
      for (const rate of rates) {
        const { grossAmount } = add(amount, rate)
        expect(remove(grossAmount, rate).netAmount).toBeCloseTo(amount, 8)
      }
    }
  })

  it('adding IVA back to a base made by removing IVA recovers the total', () => {
    for (const amount of amounts) {
      for (const rate of rates) {
        const { netAmount } = remove(amount, rate)
        expect(add(netAmount, rate).grossAmount).toBeCloseTo(amount, 8)
      }
    }
  })
})

describe('floating-point precision', () => {
  it('handles amounts that are not exact in binary', () => {
    const result = add(10.1, 23)
    expect(result.vatAmount).toBeCloseTo(2.323, 10)
    expect(result.grossAmount).toBeCloseTo(12.423, 10)
  })

  it('handles very large amounts', () => {
    const added = add(1e15, 23)
    expect(added.vatAmount).toBeCloseTo(2.3e14, 0)
    expect(added.grossAmount).toBeCloseTo(1.23e15, 0)

    const removed = remove(1e300, 23)
    expect(Number.isFinite(removed.netAmount)).toBe(true)
    expect(Number.isFinite(removed.vatAmount)).toBe(true)
  })
})

describe('addVat — validation', () => {
  it.each<[number, number, VatErrorCode]>([
    [NaN, 23, 'invalidNumber'],
    [100, NaN, 'invalidNumber'],
    [Infinity, 23, 'invalidNumber'],
    [-Infinity, 23, 'invalidNumber'],
    [100, Infinity, 'invalidNumber'],
    [100, -Infinity, 'invalidNumber'],
    [-1, 23, 'amountNegative'],
    [-0.01, 23, 'amountNegative'],
    [-100, 23, 'amountNegative'],
    [100, -1, 'rateNegative'],
    [100, -0.01, 'rateNegative'],
    [100, -23, 'rateNegative'],
    [1e308, 23, 'resultOverflow'],
    [100, 1e308, 'resultOverflow'],
  ])('(%d, %d) → %s', (amount, rate, code) => {
    expect(addVat(amount, rate)).toMatchObject({ status: 'error', code })
  })

  it('reports non-finite values before negative ones', () => {
    expect(addVat(NaN, -5)).toMatchObject({ code: 'invalidNumber' })
  })

  it('reports a negative amount before a negative rate', () => {
    expect(addVat(-5, -5)).toMatchObject({ code: 'amountNegative' })
  })

  it('accepts a very large amount when there is no IVA to add', () => {
    expect(addVat(1e308, 0)).toMatchObject({ status: 'ok', vatAmount: 0, grossAmount: 1e308 })
  })

  it('includes a non-empty message on errors', () => {
    const result = addVat(-1, 23)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('never throws on bad input', () => {
    expect(() => addVat(NaN, NaN)).not.toThrow()
    expect(() => addVat(-1, -1)).not.toThrow()
  })
})

describe('removeVat — validation', () => {
  it.each<[number, number, VatErrorCode]>([
    [NaN, 23, 'invalidNumber'],
    [100, NaN, 'invalidNumber'],
    [Infinity, 23, 'invalidNumber'],
    [-Infinity, 23, 'invalidNumber'],
    [100, Infinity, 'invalidNumber'],
    [100, -Infinity, 'invalidNumber'],
    [-1, 23, 'amountNegative'],
    [-0.01, 23, 'amountNegative'],
    [-100, 23, 'amountNegative'],
    [100, -1, 'rateNegative'],
    [100, -0.01, 'rateNegative'],
    [100, -23, 'rateNegative'],
    [100, -100, 'rateNegative'],
    [1e308, 23, 'resultOverflow'],
  ])('(%d, %d) → %s', (amount, rate, code) => {
    expect(removeVat(amount, rate)).toMatchObject({ status: 'error', code })
  })

  it('reports non-finite values before negative ones', () => {
    expect(removeVat(NaN, -5)).toMatchObject({ code: 'invalidNumber' })
  })

  it('reports a negative amount before a negative rate', () => {
    expect(removeVat(-5, -5)).toMatchObject({ code: 'amountNegative' })
  })

  it('stays finite for a huge rate (the divisor is never zero)', () => {
    const result = remove(100, 1e308)
    expect(Number.isFinite(result.netAmount)).toBe(true)
    expect(result.netAmount).toBeGreaterThanOrEqual(0)
    expect(result.vatAmount).toBeCloseTo(100, 8)
  })

  it('includes a non-empty message on errors', () => {
    const result = removeVat(-1, 23)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('never throws on bad input', () => {
    expect(() => removeVat(NaN, NaN)).not.toThrow()
    expect(() => removeVat(-1, -100)).not.toThrow()
  })
})

describe('with Portuguese decimal input (parseLocaleNumber)', () => {
  function parsed(raw: string): number {
    const value = parseLocaleNumber(raw)
    if (value === null) throw new Error(`Could not parse ${raw}`)
    return value
  }

  it('adds IVA to a comma-decimal amount', () => {
    const result = add(parsed('1234,56'), parsed('23'))
    expect(result.vatAmount).toBeCloseTo(283.9488, 6)
    expect(result.grossAmount).toBeCloseTo(1518.5088, 6)
  })

  it('accepts a dot decimal separator too', () => {
    const result = add(parsed('1234.56'), parsed('23'))
    expect(result.vatAmount).toBeCloseTo(283.9488, 6)
    expect(result.grossAmount).toBeCloseTo(1518.5088, 6)
  })

  it('removes IVA from a comma-decimal amount', () => {
    const result = remove(parsed('1518,51'), parsed('23'))
    expect(result.netAmount).toBeCloseTo(1234.560976, 5)
    expect(result.vatAmount).toBeCloseTo(283.949024, 5)
  })

  it('accepts a comma-decimal custom rate', () => {
    const result = add(parsed('200'), parsed('8,5'))
    expect(result.vatAmount).toBeCloseTo(17, 10)
    expect(result.grossAmount).toBeCloseTo(217, 10)
  })

  it('leaves unparseable text for the UI to reject before calculating', () => {
    expect(parseLocaleNumber('abc')).toBeNull()
    expect(parseLocaleNumber('')).toBeNull()
  })
})

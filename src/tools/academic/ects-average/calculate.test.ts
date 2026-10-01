import { describe, expect, it } from 'vitest'
import { parseLocaleNumber } from '../../../lib/validation'
import { calculateEctsAverage } from './calculate'
import type { EctsSubject } from './calculate'

function average(subjects: EctsSubject[]) {
  const result = calculateEctsAverage(subjects)
  if (result.status !== 'ok') {
    throw new Error(`Expected an ok result, got error: ${result.message}`)
  }
  return result
}

function errorMessage(subjects: EctsSubject[]): string {
  const result = calculateEctsAverage(subjects)
  if (result.status !== 'error') {
    throw new Error('Expected an error result')
  }
  return result.message
}

const MSG_EMPTY = 'Adiciona pelo menos uma unidade curricular.'
const MSG_NUMERIC = 'Introduz valores numéricos válidos.'
const MSG_GRADE = 'A nota tem de estar entre 0 e 20.'
const MSG_ECTS = 'Os ECTS têm de ser maiores que zero.'
const MSG_OVERFLOW = 'O resultado não é um número válido.'

describe('calculateEctsAverage — basic weighted average', () => {
  // [subjects as [grade, ects][], average, totalEcts]
  const cases: [[number, number][], number, number][] = [
    // basic
    [[[15, 6], [12, 4]], 13.8, 10],
    // equal ECTS behaves like a simple average
    [[[10, 6], [14, 6], [18, 6]], 14, 18],
    // different ECTS: the heavier subject dominates
    [[[20, 9], [10, 1]], 19, 10],
    [[[18, 3], [10, 9]], 12, 12],
    // realistic semester
    [[[14, 6], [16, 6], [12, 5], [18, 4], [15, 3]], 14.875, 24],
    // a zero grade still counts towards the total ECTS
    [[[0, 6], [20, 6]], 10, 12],
  ]

  it.each(cases)('%j → %d', (pairs, expectedAverage, expectedTotal) => {
    const result = average(pairs.map(([grade, ects]) => ({ grade, ects })))
    expect(result.average).toBeCloseTo(expectedAverage, 10)
    expect(result.totalEcts).toBeCloseTo(expectedTotal, 10)
  })

  it('weights by ECTS, unlike a simple average', () => {
    // Simple average would be 14; ECTS-weighted is 12.
    expect(average([{ grade: 18, ects: 3 }, { grade: 10, ects: 9 }]).average).toBeCloseTo(12, 10)
  })

  it('does not depend on the order of the subjects', () => {
    const subjects: EctsSubject[] = [
      { grade: 14, ects: 6 },
      { grade: 16, ects: 6 },
      { grade: 12, ects: 5 },
      { grade: 18, ects: 4 },
    ]
    const forward = average(subjects)
    const backward = average([...subjects].reverse())
    expect(backward.average).toBeCloseTo(forward.average, 10)
    expect(backward.totalEcts).toBeCloseTo(forward.totalEcts, 10)
  })

  it('does not mutate its input', () => {
    const subjects: EctsSubject[] = Object.freeze([
      Object.freeze({ grade: 15, ects: 6 }),
      Object.freeze({ grade: 12, ects: 4 }),
    ]) as unknown as EctsSubject[]
    expect(() => calculateEctsAverage(subjects)).not.toThrow()
    expect(subjects).toEqual([
      { grade: 15, ects: 6 },
      { grade: 12, ects: 4 },
    ])
  })
})

describe('calculateEctsAverage — single and multiple subjects', () => {
  it('handles a single subject', () => {
    expect(calculateEctsAverage([{ grade: 13.5, ects: 6 }])).toEqual({
      status: 'ok',
      average: 13.5,
      totalEcts: 6,
      subjectCount: 1,
    })
  })

  it('handles a single subject with decimal ECTS', () => {
    const result = average([{ grade: 17, ects: 7.5 }])
    expect(result.average).toBeCloseTo(17, 10)
    expect(result.totalEcts).toBeCloseTo(7.5, 10)
    expect(result.subjectCount).toBe(1)
  })

  it('handles many subjects with the same grade', () => {
    const subjects: EctsSubject[] = [3, 4, 5, 6, 6, 6, 7, 8, 9, 10].map((ects) => ({ grade: 15, ects }))
    const result = average(subjects)
    expect(result.average).toBeCloseTo(15, 10)
    expect(result.totalEcts).toBe(64)
    expect(result.subjectCount).toBe(10)
  })
})

describe('calculateEctsAverage — totals and counts', () => {
  it('reports the total ECTS considered', () => {
    expect(average([{ grade: 15, ects: 6 }, { grade: 12, ects: 4 }, { grade: 18, ects: 5 }]).totalEcts).toBe(15)
  })

  it('reports the number of subjects', () => {
    expect(average([{ grade: 15, ects: 6 }, { grade: 12, ects: 4 }, { grade: 18, ects: 5 }]).subjectCount).toBe(3)
  })

  it('counts subjects with identical values separately', () => {
    const result = average([
      { grade: 14, ects: 6 },
      { grade: 14, ects: 6 },
    ])
    expect(result.subjectCount).toBe(2)
    expect(result.totalEcts).toBe(12)
  })
})

describe('calculateEctsAverage — decimals', () => {
  it('handles decimal grades', () => {
    expect(average([{ grade: 14.5, ects: 6 }, { grade: 15.5, ects: 6 }]).average).toBeCloseTo(15, 10)
  })

  it('handles decimal grades with different ECTS', () => {
    // (13.7 × 5 + 16.2 × 7) / 12 = 181.9 / 12
    expect(average([{ grade: 13.7, ects: 5 }, { grade: 16.2, ects: 7 }]).average).toBeCloseTo(15.1583333333, 8)
  })

  it('handles decimal ECTS', () => {
    const result = average([{ grade: 14, ects: 2.5 }, { grade: 16, ects: 7.5 }])
    expect(result.average).toBeCloseTo(15.5, 10)
    expect(result.totalEcts).toBeCloseTo(10, 10)
  })

  it('handles half-credit ECTS', () => {
    const result = average([{ grade: 10, ects: 0.5 }, { grade: 20, ects: 1.5 }])
    expect(result.average).toBeCloseTo(17.5, 10)
    expect(result.totalEcts).toBeCloseTo(2, 10)
  })

  it('handles a very small positive ECTS value', () => {
    expect(average([{ grade: 20, ects: 1e-9 }]).average).toBeCloseTo(20, 10)
  })
})

describe('calculateEctsAverage — grade boundaries', () => {
  it('accepts a grade of 0', () => {
    expect(average([{ grade: 0, ects: 6 }]).average).toBe(0)
  })

  it('accepts a grade of 20', () => {
    expect(average([{ grade: 20, ects: 6 }]).average).toBe(20)
  })

  it('averages the two extremes', () => {
    expect(average([{ grade: 0, ects: 5 }, { grade: 20, ects: 5 }]).average).toBeCloseTo(10, 10)
  })
})

describe('calculateEctsAverage — floating-point edge cases', () => {
  it('keeps equal grades equal under awkward decimal ECTS', () => {
    const result = average([
      { grade: 13.7, ects: 0.1 },
      { grade: 13.7, ects: 0.2 },
      { grade: 13.7, ects: 0.3 },
    ])
    expect(result.average).toBeCloseTo(13.7, 10)
    expect(result.totalEcts).toBeCloseTo(0.6, 10)
  })

  it('never exceeds 20 when every grade is 20', () => {
    const result = average([
      { grade: 20, ects: 0.1 },
      { grade: 20, ects: 0.2 },
      { grade: 20, ects: 0.3 },
    ])
    expect(result.average).toBeLessThanOrEqual(20)
    expect(result.average).toBeCloseTo(20, 10)
  })

  it('never goes below 0 when every grade is 0', () => {
    const result = average([
      { grade: 0, ects: 0.1 },
      { grade: 0, ects: 0.2 },
    ])
    expect(result.average).toBe(0)
  })

  it('sums 0.1 + 0.2 ECTS to about 0.3', () => {
    expect(average([{ grade: 10, ects: 0.1 }, { grade: 10, ects: 0.2 }]).totalEcts).toBeCloseTo(0.3, 10)
  })

  it('gets one-third / two-thirds weights right', () => {
    // 14.1 / 3 + 15.9 × 2 / 3 = 15.3
    expect(average([{ grade: 14.1, ects: 3.3 }, { grade: 15.9, ects: 6.6 }]).average).toBeCloseTo(15.3, 10)
  })

  it('always keeps the average within 0–20', () => {
    const sets: [number, number][][] = [
      [[20, 0.3], [20, 0.6], [20, 0.1]],
      [[0, 0.7], [0, 0.2]],
      [[19.99, 1.1], [0.01, 2.3], [10, 3.7]],
      [[12.345, 6], [17.89, 4.5], [8.1, 3.3]],
    ]
    for (const pairs of sets) {
      const { average: value } = average(pairs.map(([grade, ects]) => ({ grade, ects })))
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(20)
    }
  })
})

describe('calculateEctsAverage — empty input', () => {
  it('returns an error for an empty list', () => {
    expect(calculateEctsAverage([])).toEqual({ status: 'error', message: MSG_EMPTY })
  })
})

describe('calculateEctsAverage — invalid ECTS', () => {
  it.each([
    [[{ grade: 15, ects: 0 }]],
    [[{ grade: 15, ects: -3 }]],
    [[{ grade: 15, ects: -0.01 }]],
    [[{ grade: 15, ects: 6 }, { grade: 12, ects: 0 }]],
    [[{ grade: 15, ects: 0 }, { grade: 12, ects: 4 }]],
  ] as [EctsSubject[]][])('rejects %j', (subjects) => {
    expect(errorMessage(subjects)).toBe(MSG_ECTS)
  })
})

describe('calculateEctsAverage — invalid grades', () => {
  it.each([
    [[{ grade: -1, ects: 6 }]],
    [[{ grade: -0.01, ects: 6 }]],
    [[{ grade: 20.01, ects: 6 }]],
    [[{ grade: 25, ects: 6 }]],
    [[{ grade: 15, ects: 6 }, { grade: 21, ects: 4 }]],
  ] as [EctsSubject[]][])('rejects %j', (subjects) => {
    expect(errorMessage(subjects)).toBe(MSG_GRADE)
  })
})

describe('calculateEctsAverage — non-finite values', () => {
  it.each([
    [[{ grade: NaN, ects: 6 }]],
    [[{ grade: 15, ects: NaN }]],
    [[{ grade: Infinity, ects: 6 }]],
    [[{ grade: -Infinity, ects: 6 }]],
    [[{ grade: 15, ects: Infinity }]],
    [[{ grade: 15, ects: -Infinity }]],
    [[{ grade: 15, ects: 6 }, { grade: NaN, ects: 4 }]],
  ] as [EctsSubject[]][])('rejects %j', (subjects) => {
    expect(errorMessage(subjects)).toBe(MSG_NUMERIC)
  })
})

describe('calculateEctsAverage — validation order and behaviour', () => {
  it('reports a non-finite value before a range error', () => {
    expect(errorMessage([{ grade: NaN, ects: 6 }, { grade: 25, ects: 0 }])).toBe(MSG_NUMERIC)
  })

  it('reports a grade error before an ECTS error', () => {
    expect(errorMessage([{ grade: 25, ects: 0 }])).toBe(MSG_GRADE)
  })

  it('does not return a partial result when only one subject is invalid', () => {
    const result = calculateEctsAverage([
      { grade: 15, ects: 6 },
      { grade: 12, ects: 0 },
    ])
    expect(result.status).toBe('error')
    expect(result).not.toHaveProperty('average')
  })

  it('reports an overflow in the weighted sum instead of returning Infinity', () => {
    expect(errorMessage([{ grade: 20, ects: 1e308 }])).toBe(MSG_OVERFLOW)
  })

  it('reports an overflow in the total ECTS', () => {
    expect(errorMessage([{ grade: 10, ects: 1e308 }, { grade: 10, ects: 1e308 }])).toBe(MSG_OVERFLOW)
  })

  it('never throws on bad input', () => {
    expect(() => calculateEctsAverage([])).not.toThrow()
    expect(() => calculateEctsAverage([{ grade: NaN, ects: NaN }])).not.toThrow()
    expect(() => calculateEctsAverage([{ grade: -5, ects: -5 }])).not.toThrow()
  })
})

describe('calculateEctsAverage — Portuguese decimal input (parseLocaleNumber)', () => {
  function parsed(raw: string): number {
    const value = parseLocaleNumber(raw)
    if (value === null) throw new Error(`Could not parse ${raw}`)
    return value
  }

  it('handles comma decimals', () => {
    // (14,5 × 6 + 16 × 4,5) / 10,5 = 159 / 10,5
    const result = average([
      { grade: parsed('14,5'), ects: parsed('6') },
      { grade: parsed('16'), ects: parsed('4,5') },
    ])
    expect(result.average).toBeCloseTo(15.142857, 5)
    expect(result.totalEcts).toBeCloseTo(10.5, 10)
  })

  it('handles dot decimals too', () => {
    const result = average([
      { grade: parsed('14.5'), ects: parsed('6') },
      { grade: parsed('16'), ects: parsed('4.5') },
    ])
    expect(result.average).toBeCloseTo(15.142857, 5)
  })

  it('leaves unparseable text for the UI to reject before calculating', () => {
    expect(parseLocaleNumber('abc')).toBeNull()
    expect(parseLocaleNumber('')).toBeNull()
  })
})

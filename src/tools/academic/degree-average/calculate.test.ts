import { describe, expect, it } from 'vitest'
import { calculateEctsAverage, calculateSimpleAverage } from './calculate'

describe('calculateSimpleAverage', () => {
  it('calculates a plain average', () => {
    expect(calculateSimpleAverage([{ grade: 14, ects: 6 }, { grade: 16, ects: 3 }])).toBeCloseTo(15, 5)
  })

  it('returns null for an empty list', () => {
    expect(calculateSimpleAverage([])).toBeNull()
  })
})

describe('calculateEctsAverage', () => {
  it('calculates an ECTS-weighted average', () => {
    const result = calculateEctsAverage([
      { grade: 14, ects: 6 },
      { grade: 18, ects: 3 },
    ])
    expect(result).toBeCloseTo(15.333333, 4)
  })

  it('returns null when total ECTS is zero or invalid', () => {
    expect(calculateEctsAverage([{ grade: 14, ects: 0 }])).toBeNull()
    expect(calculateEctsAverage([])).toBeNull()
  })

  it('differs from the simple average when ECTS are uneven', () => {
    const subjects = [
      { grade: 10, ects: 30 },
      { grade: 20, ects: 3 },
    ]
    const simple = calculateSimpleAverage(subjects)
    const ectsWeighted = calculateEctsAverage(subjects)
    expect(simple).not.toBeCloseTo(ectsWeighted as number, 1)
  })
})

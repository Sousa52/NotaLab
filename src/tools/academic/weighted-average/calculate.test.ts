import { describe, expect, it } from 'vitest'
import { calculateWeightedAverage, isCompleteWeight, totalWeight } from './calculate'

describe('calculateWeightedAverage', () => {
  it('calculates a normal valid case', () => {
    const result = calculateWeightedAverage([
      { grade: 14, weight: 40 },
      { grade: 16, weight: 60 },
    ])
    expect(result).toBeCloseTo(15.2, 5)
  })

  it('handles multiple components', () => {
    const result = calculateWeightedAverage([
      { grade: 12, weight: 20 },
      { grade: 15, weight: 30 },
      { grade: 18, weight: 50 },
    ])
    expect(result).toBeCloseTo(15.9, 5)
  })

  it('still computes an average when weights do not total 100%', () => {
    const result = calculateWeightedAverage([
      { grade: 10, weight: 30 },
      { grade: 20, weight: 30 },
    ])
    expect(result).toBeCloseTo(15, 5)
  })

  it('returns null when there is no positive weight', () => {
    expect(calculateWeightedAverage([])).toBeNull()
    expect(calculateWeightedAverage([{ grade: 10, weight: 0 }])).toBeNull()
  })
})

describe('totalWeight', () => {
  it('sums component weights', () => {
    expect(totalWeight([{ grade: 10, weight: 40 }, { grade: 10, weight: 60 }])).toBe(100)
  })
})

describe('isCompleteWeight', () => {
  it('is true when weights total 100%', () => {
    expect(isCompleteWeight([{ grade: 10, weight: 40 }, { grade: 10, weight: 60 }])).toBe(true)
  })

  it('is false when weights do not total 100%', () => {
    expect(isCompleteWeight([{ grade: 10, weight: 40 }, { grade: 10, weight: 50 }])).toBe(false)
  })
})

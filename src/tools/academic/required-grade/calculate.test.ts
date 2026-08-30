import { describe, expect, it } from 'vitest'
import { calculateRequiredGrade } from './calculate'

describe('calculateRequiredGrade', () => {
  it('calculates the normal valid case', () => {
    const result = calculateRequiredGrade({
      currentGrade: 12,
      currentWeight: 40,
      desiredGrade: 14,
      remainingWeight: 60,
    })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.requiredGrade).toBeCloseTo(15.333333, 4)
    }
  })

  it('flags an impossible target above 20', () => {
    const result = calculateRequiredGrade({
      currentGrade: 5,
      currentWeight: 50,
      desiredGrade: 18,
      remainingWeight: 50,
    })
    expect(result.status).toBe('impossible')
  })

  it('flags an already-achieved target below 0', () => {
    const result = calculateRequiredGrade({
      currentGrade: 18,
      currentWeight: 80,
      desiredGrade: 10,
      remainingWeight: 20,
    })
    expect(result.status).toBe('already-achieved')
  })

  it('rejects a zero or negative remaining weight', () => {
    expect(
      calculateRequiredGrade({
        currentGrade: 10,
        currentWeight: 100,
        desiredGrade: 12,
        remainingWeight: 0,
      }).status,
    ).toBe('invalid-weight')

    expect(
      calculateRequiredGrade({
        currentGrade: 10,
        currentWeight: 100,
        desiredGrade: 12,
        remainingWeight: -10,
      }).status,
    ).toBe('invalid-weight')
  })
})

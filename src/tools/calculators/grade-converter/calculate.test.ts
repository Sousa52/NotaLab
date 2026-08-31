import { describe, expect, it } from 'vitest'
import { GRADE_SCALES, convertGrade, getGradeScale, isValueInScaleRange, type GradeScaleId } from './calculate'

describe('GRADE_SCALES / getGradeScale', () => {
  it('defines exactly the three expected scales with the documented ranges', () => {
    expect(GRADE_SCALES).toHaveLength(3)
    expect(getGradeScale('pt20')).toMatchObject({ min: 0, max: 20 })
    expect(getGradeScale('percentage')).toMatchObject({ min: 0, max: 100 })
    expect(getGradeScale('gpa4')).toMatchObject({ min: 0, max: 4 })
  })

  it('throws for an unknown scale id', () => {
    expect(() => getGradeScale('bogus' as GradeScaleId)).toThrow()
  })
})

describe('isValueInScaleRange', () => {
  it('accepts the full inclusive range for the Portuguese scale', () => {
    expect(isValueInScaleRange(0, 'pt20')).toBe(true)
    expect(isValueInScaleRange(20, 'pt20')).toBe(true)
    expect(isValueInScaleRange(14.5, 'pt20')).toBe(true)
  })

  it('rejects out-of-range values for the Portuguese scale', () => {
    expect(isValueInScaleRange(-1, 'pt20')).toBe(false)
    expect(isValueInScaleRange(20.1, 'pt20')).toBe(false)
  })

  it('accepts the full inclusive range for percentage, including 0%', () => {
    expect(isValueInScaleRange(0, 'percentage')).toBe(true)
    expect(isValueInScaleRange(100, 'percentage')).toBe(true)
  })

  it('rejects out-of-range values for percentage', () => {
    expect(isValueInScaleRange(-0.5, 'percentage')).toBe(false)
    expect(isValueInScaleRange(100.1, 'percentage')).toBe(false)
  })

  it('accepts the full inclusive range for GPA', () => {
    expect(isValueInScaleRange(0, 'gpa4')).toBe(true)
    expect(isValueInScaleRange(4, 'gpa4')).toBe(true)
    expect(isValueInScaleRange(3.7, 'gpa4')).toBe(true)
  })

  it('rejects out-of-range values for GPA', () => {
    expect(isValueInScaleRange(-0.1, 'gpa4')).toBe(false)
    expect(isValueInScaleRange(4.01, 'gpa4')).toBe(false)
  })
})

describe('convertGrade — top marks are treated as equivalent (20 = 100% = 4.0)', () => {
  it('converts a perfect Portuguese score to the other scales', () => {
    expect(convertGrade(20, 'pt20', 'percentage')).toBe(100)
    expect(convertGrade(20, 'pt20', 'gpa4')).toBe(4)
  })

  it('converts a perfect percentage score to the other scales', () => {
    expect(convertGrade(100, 'percentage', 'pt20')).toBe(20)
    expect(convertGrade(100, 'percentage', 'gpa4')).toBe(4)
  })

  it('converts a perfect GPA score to the other scales', () => {
    expect(convertGrade(4, 'gpa4', 'pt20')).toBe(20)
    expect(convertGrade(4, 'gpa4', 'percentage')).toBe(100)
  })
})

describe('convertGrade — zero and mid-range values', () => {
  it('converts zero to zero on every scale', () => {
    expect(convertGrade(0, 'pt20', 'percentage')).toBe(0)
    expect(convertGrade(0, 'pt20', 'gpa4')).toBe(0)
    expect(convertGrade(0, 'gpa4', 'pt20')).toBe(0)
  })

  it('converts a mid-range Portuguese grade proportionally', () => {
    expect(convertGrade(10, 'pt20', 'percentage')).toBe(50)
    expect(convertGrade(10, 'pt20', 'gpa4')).toBe(2)
  })

  it('converts back from percentage and GPA to the Portuguese scale', () => {
    expect(convertGrade(50, 'percentage', 'pt20')).toBe(10)
    expect(convertGrade(2, 'gpa4', 'pt20')).toBe(10)
  })

  it('handles decimal grades', () => {
    expect(convertGrade(15.5, 'pt20', 'gpa4')).toBeCloseTo(3.1, 10)
    expect(convertGrade(14, 'pt20', 'percentage')).toBeCloseTo(70, 10)
    expect(convertGrade(3.2, 'gpa4', 'pt20')).toBeCloseTo(16, 10)
  })
})

describe('convertGrade — round trips', () => {
  it('returns to (approximately) the original value after converting there and back', () => {
    const toPercentage = convertGrade(14.5, 'pt20', 'percentage')
    const backToPt20 = convertGrade(toPercentage, 'percentage', 'pt20')
    expect(backToPt20).toBeCloseTo(14.5, 8)

    const toGpa = convertGrade(17.3, 'pt20', 'gpa4')
    const backFromGpa = convertGrade(toGpa, 'gpa4', 'pt20')
    expect(backFromGpa).toBeCloseTo(17.3, 8)
  })
})

describe('convertGrade — identity conversions are exact', () => {
  // Same rationale as the unit converter's identity fix: value * factor / factor
  // (here, normalizing then re-scaling by the same range) can introduce
  // floating-point noise even though converting a scale to itself is a no-op.
  it('returns the exact input for every scale converted to itself', () => {
    expect(convertGrade(14.3, 'pt20', 'pt20')).toBe(14.3)
    expect(convertGrade(71.25, 'percentage', 'percentage')).toBe(71.25)
    expect(convertGrade(3.65, 'gpa4', 'gpa4')).toBe(3.65)
  })

  it('still throws for an unknown scale even when fromScale equals toScale', () => {
    expect(() => convertGrade(10, 'bogus' as GradeScaleId, 'bogus' as GradeScaleId)).toThrow()
  })
})

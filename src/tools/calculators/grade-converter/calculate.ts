import { isValidGrade } from '../../../lib/validation'

export type GradeScaleId = 'pt20' | 'percentage' | 'gpa4'

export interface GradeScaleDefinition {
  id: GradeScaleId
  /** Shown in the scale dropdowns. */
  label: string
  /** Short form shown next to the converted result. */
  symbol: string
  min: number
  max: number
}

export const GRADE_SCALES: GradeScaleDefinition[] = [
  { id: 'pt20', label: 'Escala portuguesa (0–20)', symbol: 'valores', min: 0, max: 20 },
  { id: 'percentage', label: 'Percentagem (0–100%)', symbol: '%', min: 0, max: 100 },
  { id: 'gpa4', label: 'GPA (0–4.0)', symbol: 'GPA', min: 0, max: 4 },
]

export function getGradeScale(id: GradeScaleId): GradeScaleDefinition {
  const scale = GRADE_SCALES.find((s) => s.id === id)
  if (!scale) {
    throw new Error(`Escala de notas desconhecida: ${id}`)
  }
  return scale
}

/** Whether `value` falls within the valid (inclusive) range for the given scale. */
export function isValueInScaleRange(value: number, scaleId: GradeScaleId): boolean {
  // Reuse the shared 0-20 grade validator for the scale it was built for.
  if (scaleId === 'pt20') return isValidGrade(value)

  const scale = getGradeScale(scaleId)
  return value >= scale.min && value <= scale.max
}

/**
 * Converts a grade proportionally between scales, treating top marks as equivalent
 * (20 = 100% = 4.0). This is a mathematical approximation for getting a general sense
 * of a grade in another scale — it is NOT an official equivalency used by universities
 * or accreditation bodies, which often apply their own non-linear conversion tables.
 */
export function convertGrade(value: number, fromScale: GradeScaleId, toScale: GradeScaleId): number {
  // Converting a scale to itself must return the input unchanged, before running it
  // through any division/multiplication that could introduce floating-point noise.
  if (fromScale === toScale) {
    getGradeScale(fromScale) // still validates the scale id
    return value
  }

  const from = getGradeScale(fromScale)
  const to = getGradeScale(toScale)

  const normalized = (value - from.min) / (from.max - from.min)
  return to.min + normalized * (to.max - to.min)
}

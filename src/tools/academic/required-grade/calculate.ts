export interface RequiredGradeInput {
  currentGrade: number
  currentWeight: number
  desiredGrade: number
  remainingWeight: number
}

export type RequiredGradeResult =
  | { status: 'ok'; requiredGrade: number }
  | { status: 'already-achieved' }
  | { status: 'impossible' }
  | { status: 'invalid-weight' }

/**
 * Required grade in the remaining assessment(s) to reach a desired final grade,
 * given the grade and weight already secured.
 */
export function calculateRequiredGrade(input: RequiredGradeInput): RequiredGradeResult {
  const { currentGrade, currentWeight, desiredGrade, remainingWeight } = input

  if (remainingWeight <= 0) return { status: 'invalid-weight' }

  const combinedWeight = currentWeight + remainingWeight
  const requiredGrade =
    (desiredGrade * combinedWeight - currentGrade * currentWeight) / remainingWeight

  if (requiredGrade < 0) return { status: 'already-achieved' }
  if (requiredGrade > 20) return { status: 'impossible' }
  return { status: 'ok', requiredGrade }
}

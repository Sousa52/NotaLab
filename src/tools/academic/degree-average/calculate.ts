export interface DegreeSubject {
  grade: number
  ects: number
}

/** Simple (unweighted) average of subject grades. */
export function calculateSimpleAverage(subjects: DegreeSubject[]): number | null {
  if (subjects.length === 0) return null
  const sum = subjects.reduce((total, s) => total + s.grade, 0)
  return sum / subjects.length
}

/** ECTS-weighted average of subject grades. Returns null when total ECTS is not positive. */
export function calculateEctsAverage(subjects: DegreeSubject[]): number | null {
  const totalEcts = subjects.reduce((total, s) => total + s.ects, 0)
  if (totalEcts <= 0) return null
  const weightedSum = subjects.reduce((total, s) => total + s.grade * s.ects, 0)
  return weightedSum / totalEcts
}

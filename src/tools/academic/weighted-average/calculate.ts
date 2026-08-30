export interface WeightedComponent {
  grade: number
  weight: number
}

/** Sum of all component weights, in percentage points. */
export function totalWeight(components: WeightedComponent[]): number {
  return components.reduce((sum, c) => sum + c.weight, 0)
}

/**
 * Weighted average on the 0-20 scale.
 * Returns null when there is no positive weight to average against.
 */
export function calculateWeightedAverage(components: WeightedComponent[]): number | null {
  const weight = totalWeight(components)
  if (weight <= 0) return null

  const weightedSum = components.reduce((sum, c) => sum + c.grade * c.weight, 0)
  return weightedSum / weight
}

/** Whether the total weight is close enough to 100% to be considered complete. */
export function isCompleteWeight(components: WeightedComponent[]): boolean {
  return Math.abs(totalWeight(components) - 100) < 0.01
}

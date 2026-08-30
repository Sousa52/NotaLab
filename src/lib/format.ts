export function formatGrade(value: number): string {
  return value.toLocaleString('pt-PT', { maximumFractionDigits: 2 })
}

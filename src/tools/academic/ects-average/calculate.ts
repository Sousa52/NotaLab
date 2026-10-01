// Pure ECTS-weighted average logic — no React, no DOM, no eval/Function. Returns a typed
// result instead of throwing, matching the pattern used across NotaLab's calculators.
//
// média = Σ(nota × ECTS) / Σ(ECTS), on the project's 0–20 grade scale.

import { isPositive, isValidGrade } from '../../../lib/validation'

export interface EctsSubject {
  /** Grade on the 0–20 scale (decimals allowed). */
  grade: number
  /** ECTS credits (decimals allowed, must be greater than zero). */
  ects: number
}

export type EctsAverageResult =
  | { status: 'ok'; average: number; totalEcts: number; subjectCount: number }
  | { status: 'error'; message: string }

function error(message: string): EctsAverageResult {
  return { status: 'error', message }
}

/**
 * ECTS-weighted average of the given subjects.
 *
 * Validation, checked in this order: at least one subject; every grade and ECTS value is a
 * finite number; every grade is between 0 and 20 (inclusive); every ECTS value is greater
 * than zero.
 */
export function calculateEctsAverage(subjects: EctsSubject[]): EctsAverageResult {
  if (subjects.length === 0) {
    return error('Adiciona pelo menos uma unidade curricular.')
  }
  if (subjects.some((s) => !Number.isFinite(s.grade) || !Number.isFinite(s.ects))) {
    return error('Introduz valores numéricos válidos.')
  }
  if (subjects.some((s) => !isValidGrade(s.grade))) {
    return error('A nota tem de estar entre 0 e 20.')
  }
  if (subjects.some((s) => !isPositive(s.ects))) {
    return error('Os ECTS têm de ser maiores que zero.')
  }

  const totalEcts = subjects.reduce((sum, s) => sum + s.ects, 0)
  const weightedSum = subjects.reduce((sum, s) => sum + s.grade * s.ects, 0)
  const rawAverage = weightedSum / totalEcts

  if (!Number.isFinite(totalEcts) || !Number.isFinite(rawAverage)) {
    return error('O resultado não é um número válido.')
  }

  // Every grade is within 0–20, so the true average is too; this only removes
  // floating-point noise such as 20.000000000000004.
  const average = Math.min(20, Math.max(0, rawAverage))

  return { status: 'ok', average, totalEcts, subjectCount: subjects.length }
}

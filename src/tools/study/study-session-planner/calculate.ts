export interface StudySession {
  name: string
  minutes: number
}

export interface BreakSuggestion {
  count: number
  minutesEach: number
  totalMinutes: number
}

export interface StudyPlan {
  totalMinutes: number
  subjectCount: number
  sessions: StudySession[]
  breakSuggestion: BreakSuggestion | null
}

export type StudyPlanResult =
  | { status: 'ok'; plan: StudyPlan }
  | { status: 'invalid-duration' }
  | { status: 'no-subjects' }

export function combineHoursAndMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes
}

/** Falls back to a generic "Assunto N" label when the user leaves a name blank. */
export function resolveSubjectName(rawName: string, index: number): string {
  const trimmed = rawName.trim()
  return trimmed !== '' ? trimmed : `Assunto ${index + 1}`
}

/**
 * Splits the available time equally across subjects using integer minutes, so the
 * sessions always sum to exactly `totalMinutes` (the remainder is handed out one
 * minute at a time to the first subjects, never lost to rounding). If there are more
 * subjects than minutes, some sessions unavoidably get 0 minutes — this is the best
 * any equal split can do in that case.
 */
function distributeStudyTime(totalMinutes: number, subjectNames: string[]): StudySession[] {
  const count = subjectNames.length
  const base = Math.floor(totalMinutes / count)
  const remainder = totalMinutes % count

  return subjectNames.map((rawName, index) => ({
    name: resolveSubjectName(rawName, index),
    minutes: base + (index < remainder ? 1 : 0),
  }))
}

/**
 * Deterministic break suggestion based only on total duration. Breaks are a
 * suggestion layered on top of the plan — they never reduce the study time
 * distributed to subjects.
 */
export function getBreakSuggestion(totalMinutes: number): BreakSuggestion | null {
  const minutesEach = 10

  if (totalMinutes < 60) return null
  if (totalMinutes < 120) return { count: 1, minutesEach, totalMinutes: minutesEach }
  if (totalMinutes < 180) return { count: 2, minutesEach, totalMinutes: minutesEach * 2 }

  const count = Math.floor(totalMinutes / 60)
  return { count, minutesEach, totalMinutes: count * minutesEach }
}

/**
 * Builds a full study plan: equally-divided sessions plus a break suggestion.
 * Returns a discriminated result instead of throwing, so the UI can render a
 * specific message for each invalid case.
 */
export function generateStudyPlan(totalMinutesInput: number, subjectNames: string[]): StudyPlanResult {
  const totalMinutes = Math.round(totalMinutesInput)

  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return { status: 'invalid-duration' }
  }
  if (subjectNames.length === 0) {
    return { status: 'no-subjects' }
  }

  return {
    status: 'ok',
    plan: {
      totalMinutes,
      subjectCount: subjectNames.length,
      sessions: distributeStudyTime(totalMinutes, subjectNames),
      breakSuggestion: getBreakSuggestion(totalMinutes),
    },
  }
}

/** Formats a minute count as "1 h 30 min", "2 h" or "45 min". */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}

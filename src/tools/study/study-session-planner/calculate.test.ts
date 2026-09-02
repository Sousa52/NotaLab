import { describe, expect, it } from 'vitest'
import {
  combineHoursAndMinutes,
  formatDuration,
  generateStudyPlan,
  getBreakSuggestion,
  resolveSubjectName,
} from './calculate'

describe('combineHoursAndMinutes', () => {
  it('combines hours and minutes into a total minute count', () => {
    expect(combineHoursAndMinutes(2, 30)).toBe(150)
    expect(combineHoursAndMinutes(0, 45)).toBe(45)
    expect(combineHoursAndMinutes(3, 0)).toBe(180)
  })
})

describe('resolveSubjectName', () => {
  it('keeps a trimmed custom name', () => {
    expect(resolveSubjectName('  Matemática  ', 0)).toBe('Matemática')
  })

  it('falls back to a generic label for an empty name', () => {
    expect(resolveSubjectName('', 0)).toBe('Assunto 1')
    expect(resolveSubjectName('   ', 3)).toBe('Assunto 4')
  })
})

describe('generateStudyPlan — equal distribution', () => {
  it('splits time equally when it divides evenly', () => {
    const result = generateStudyPlan(180, ['Matemática', 'Marketing', 'Economia'])
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.plan.sessions).toEqual([
        { name: 'Matemática', minutes: 60 },
        { name: 'Marketing', minutes: 60 },
        { name: 'Economia', minutes: 60 },
      ])
    }
  })

  it('distributes a remainder that cannot be split evenly, without losing any minutes', () => {
    const result = generateStudyPlan(100, ['A', 'B', 'C'])
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      const { sessions } = result.plan
      expect(sessions.map((s) => s.minutes)).toEqual([34, 33, 33])
      expect(sessions.reduce((sum, s) => sum + s.minutes, 0)).toBe(100)
    }
  })

  it('handles a single subject by giving it all the time', () => {
    const result = generateStudyPlan(90, ['Física'])
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.plan.sessions).toEqual([{ name: 'Física', minutes: 90 }])
    }
  })

  it('handles many subjects', () => {
    const subjects = ['A', 'B', 'C', 'D', 'E', 'F']
    const result = generateStudyPlan(120, subjects)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.plan.sessions).toHaveLength(6)
      expect(result.plan.sessions.reduce((sum, s) => sum + s.minutes, 0)).toBe(120)
    }
  })

  it('minimises zero-minute sessions when there are more subjects than minutes', () => {
    const result = generateStudyPlan(3, ['A', 'B', 'C', 'D', 'E'])
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      const minutes = result.plan.sessions.map((s) => s.minutes)
      expect(minutes).toEqual([1, 1, 1, 0, 0])
      // Exactly as many subjects get time as there are minutes available — no minute
      // is wasted, and no subject gets time it shouldn't given the constraint.
      expect(minutes.filter((m) => m > 0)).toHaveLength(3)
    }
  })

  it('uses fallback names for blank subject entries while keeping custom ones', () => {
    const result = generateStudyPlan(60, ['Química', '', '  '])
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.plan.sessions.map((s) => s.name)).toEqual(['Química', 'Assunto 2', 'Assunto 3'])
    }
  })
})

describe('generateStudyPlan — very short durations', () => {
  it('still produces a valid plan for a duration under a minute rounding boundary', () => {
    const result = generateStudyPlan(1, ['Único'])
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.plan.sessions).toEqual([{ name: 'Único', minutes: 1 }])
      expect(result.plan.breakSuggestion).toBeNull()
    }
  })
})

describe('generateStudyPlan — long study sessions', () => {
  it('handles a full day of study and reports the right break count', () => {
    const result = generateStudyPlan(480, ['A', 'B', 'C', 'D'])
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.plan.totalMinutes).toBe(480)
      expect(result.plan.sessions.reduce((sum, s) => sum + s.minutes, 0)).toBe(480)
      expect(result.plan.breakSuggestion).toEqual({ count: 8, minutesEach: 10, totalMinutes: 80 })
    }
  })
})

describe('generateStudyPlan — invalid input', () => {
  it('rejects a zero duration', () => {
    expect(generateStudyPlan(0, ['A']).status).toBe('invalid-duration')
  })

  it('rejects a negative duration', () => {
    expect(generateStudyPlan(-30, ['A']).status).toBe('invalid-duration')
  })

  it('rejects a non-finite duration', () => {
    expect(generateStudyPlan(Number.NaN, ['A']).status).toBe('invalid-duration')
    expect(generateStudyPlan(Number.POSITIVE_INFINITY, ['A']).status).toBe('invalid-duration')
  })

  it('rejects an empty subject list', () => {
    expect(generateStudyPlan(60, []).status).toBe('no-subjects')
  })

  it('checks duration before the subject list', () => {
    // With both invalid, the duration problem is the one reported.
    expect(generateStudyPlan(0, []).status).toBe('invalid-duration')
  })
})

describe('getBreakSuggestion — boundaries', () => {
  it('suggests no break under 60 minutes', () => {
    expect(getBreakSuggestion(0)).toBeNull()
    expect(getBreakSuggestion(59)).toBeNull()
  })

  it('suggests one break between 60 and 119 minutes', () => {
    expect(getBreakSuggestion(60)).toEqual({ count: 1, minutesEach: 10, totalMinutes: 10 })
    expect(getBreakSuggestion(119)).toEqual({ count: 1, minutesEach: 10, totalMinutes: 10 })
  })

  it('suggests two breaks between 120 and 179 minutes', () => {
    expect(getBreakSuggestion(120)).toEqual({ count: 2, minutesEach: 10, totalMinutes: 20 })
    expect(getBreakSuggestion(179)).toEqual({ count: 2, minutesEach: 10, totalMinutes: 20 })
  })

  it('suggests roughly a break every 60 minutes from 180 minutes onward', () => {
    expect(getBreakSuggestion(180)).toEqual({ count: 3, minutesEach: 10, totalMinutes: 30 })
    expect(getBreakSuggestion(239)).toEqual({ count: 3, minutesEach: 10, totalMinutes: 30 })
    expect(getBreakSuggestion(240)).toEqual({ count: 4, minutesEach: 10, totalMinutes: 40 })
    expect(getBreakSuggestion(600)).toEqual({ count: 10, minutesEach: 10, totalMinutes: 100 })
  })
})

describe('formatDuration', () => {
  it('formats minutes only when under an hour', () => {
    expect(formatDuration(45)).toBe('45 min')
  })

  it('formats whole hours without a minutes part', () => {
    expect(formatDuration(120)).toBe('2 h')
  })

  it('formats a mix of hours and minutes', () => {
    expect(formatDuration(150)).toBe('2 h 30 min')
  })
})

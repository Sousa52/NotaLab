export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'
export type PomodoroStatus = 'idle' | 'running' | 'paused'
export type PomodoroEvent = 'start' | 'resume' | 'pause' | 'reset' | 'skip' | 'auto-advance' | 'settings'

export interface PomodoroSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
}

export interface PomodoroState {
  settings: PomodoroSettings
  mode: PomodoroMode
  status: PomodoroStatus
  /** 1-based index of the focus session currently active (or about to run) within the cycle. */
  sessionNumber: number
  /** Total number of focus sessions completed since the timer was created or reset. */
  completedFocusSessions: number
  /** Timestamp (ms) the current segment will end. Only set while running. */
  endTimestamp: number | null
  /** Time left in the current segment, in ms. Authoritative while idle/paused. */
  remainingMs: number
  /** What produced this state, used to drive side effects (sound, announcements) without impure updaters. */
  lastEvent: PomodoroEvent | null
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
}

export const SETTINGS_LIMITS = {
  focusMinutes: { min: 1, max: 90 },
  shortBreakMinutes: { min: 1, max: 30 },
  longBreakMinutes: { min: 1, max: 60 },
  sessionsBeforeLongBreak: { min: 2, max: 8 },
} as const

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function clampSettings(settings: PomodoroSettings): PomodoroSettings {
  return {
    focusMinutes: clamp(settings.focusMinutes, SETTINGS_LIMITS.focusMinutes.min, SETTINGS_LIMITS.focusMinutes.max),
    shortBreakMinutes: clamp(
      settings.shortBreakMinutes,
      SETTINGS_LIMITS.shortBreakMinutes.min,
      SETTINGS_LIMITS.shortBreakMinutes.max,
    ),
    longBreakMinutes: clamp(
      settings.longBreakMinutes,
      SETTINGS_LIMITS.longBreakMinutes.min,
      SETTINGS_LIMITS.longBreakMinutes.max,
    ),
    sessionsBeforeLongBreak: clamp(
      settings.sessionsBeforeLongBreak,
      SETTINGS_LIMITS.sessionsBeforeLongBreak.min,
      SETTINGS_LIMITS.sessionsBeforeLongBreak.max,
    ),
  }
}

export function durationMsFor(mode: PomodoroMode, settings: PomodoroSettings): number {
  const minutes =
    mode === 'focus'
      ? settings.focusMinutes
      : mode === 'shortBreak'
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes
  return minutes * 60_000
}

export function createInitialState(settings: PomodoroSettings): PomodoroState {
  return {
    settings,
    mode: 'focus',
    status: 'idle',
    sessionNumber: 1,
    completedFocusSessions: 0,
    endTimestamp: null,
    remainingMs: durationMsFor('focus', settings),
    lastEvent: null,
  }
}

/** Remaining time in the current segment, computed from timestamps while running. */
export function getRemainingMs(state: PomodoroState, now: number): number {
  if (state.status === 'running' && state.endTimestamp !== null) {
    return Math.max(0, state.endTimestamp - now)
  }
  return state.remainingMs
}

/** Fraction (0-1) of the current segment that has elapsed. */
export function getProgress(state: PomodoroState, now: number): number {
  const duration = durationMsFor(state.mode, state.settings)
  if (duration <= 0) return 0
  const remaining = getRemainingMs(state, now)
  return Math.min(1, Math.max(0, 1 - remaining / duration))
}

export function startTimer(state: PomodoroState, now: number): PomodoroState {
  if (state.status === 'running') return state
  const wasPaused = state.status === 'paused'
  const remaining = state.remainingMs > 0 ? state.remainingMs : durationMsFor(state.mode, state.settings)
  return {
    ...state,
    status: 'running',
    endTimestamp: now + remaining,
    remainingMs: remaining,
    lastEvent: wasPaused ? 'resume' : 'start',
  }
}

export function pauseTimer(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'running') return state
  return {
    ...state,
    status: 'paused',
    endTimestamp: null,
    remainingMs: getRemainingMs(state, now),
    lastEvent: 'pause',
  }
}

export function resetTimer(state: PomodoroState): PomodoroState {
  return { ...createInitialState(state.settings), lastEvent: 'reset' }
}

/**
 * Changes settings without corrupting a segment already in progress: while idle, the
 * new durations apply immediately; while running or paused, only future segments are
 * affected and the current countdown is left untouched.
 */
export function applySettings(state: PomodoroState, settings: PomodoroSettings, now: number): PomodoroState {
  void now
  if (state.status === 'idle') {
    return { ...createInitialState(settings), lastEvent: 'settings' }
  }
  return { ...state, settings, lastEvent: 'settings' }
}

interface NextSegment {
  mode: PomodoroMode
  sessionNumber: number
  completedFocusSessions: number
}

function computeNextSegment(state: PomodoroState): NextSegment {
  if (state.mode === 'focus') {
    const completedFocusSessions = state.completedFocusSessions + 1
    const isLongBreakDue = completedFocusSessions % state.settings.sessionsBeforeLongBreak === 0
    return {
      mode: isLongBreakDue ? 'longBreak' : 'shortBreak',
      sessionNumber: state.sessionNumber,
      completedFocusSessions,
    }
  }

  return {
    mode: 'focus',
    sessionNumber: state.mode === 'longBreak' ? 1 : state.sessionNumber + 1,
    completedFocusSessions: state.completedFocusSessions,
  }
}

/** Jumps straight to the next segment, discarding whatever time was left in the current one. */
export function skipSegment(state: PomodoroState, now: number): PomodoroState {
  const next = computeNextSegment(state)
  const duration = durationMsFor(next.mode, state.settings)
  const wasRunning = state.status === 'running'

  return {
    ...state,
    mode: next.mode,
    sessionNumber: next.sessionNumber,
    completedFocusSessions: next.completedFocusSessions,
    remainingMs: duration,
    endTimestamp: wasRunning ? now + duration : null,
    status: wasRunning ? 'running' : 'idle',
    lastEvent: 'skip',
  }
}

/**
 * Advances the state if the running segment has finished by `now`. Returns the same
 * object reference when nothing changed, so callers (React state updaters) can bail
 * out of a re-render for no-op ticks.
 */
export function tick(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'running' || state.endTimestamp === null) return state
  if (now < state.endTimestamp) return state

  const next = computeNextSegment(state)
  const duration = durationMsFor(next.mode, state.settings)

  return {
    ...state,
    mode: next.mode,
    sessionNumber: next.sessionNumber,
    completedFocusSessions: next.completedFocusSessions,
    remainingMs: duration,
    endTimestamp: now + duration,
    status: 'running',
    lastEvent: 'auto-advance',
  }
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

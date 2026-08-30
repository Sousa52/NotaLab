import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  applySettings,
  clampSettings,
  createInitialState,
  durationMsFor,
  formatTime,
  getProgress,
  getRemainingMs,
  pauseTimer,
  resetTimer,
  skipSegment,
  startTimer,
  tick,
  type PomodoroSettings,
} from './calculate'

const T0 = 1_000_000

function settings(overrides: Partial<PomodoroSettings> = {}): PomodoroSettings {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

describe('createInitialState', () => {
  it('starts idle, in focus mode, at session 1 with the full focus duration', () => {
    const state = createInitialState(settings())
    expect(state.mode).toBe('focus')
    expect(state.status).toBe('idle')
    expect(state.sessionNumber).toBe(1)
    expect(state.completedFocusSessions).toBe(0)
    expect(state.endTimestamp).toBeNull()
    expect(state.remainingMs).toBe(25 * 60_000)
    expect(state.lastEvent).toBeNull()
  })

  it('uses custom durations for the initial remaining time', () => {
    const state = createInitialState(settings({ focusMinutes: 50 }))
    expect(state.remainingMs).toBe(50 * 60_000)
  })
})

describe('startTimer', () => {
  it('switches to running and sets an end timestamp from the remaining time', () => {
    const state = startTimer(createInitialState(settings()), T0)
    expect(state.status).toBe('running')
    expect(state.endTimestamp).toBe(T0 + 25 * 60_000)
    expect(state.lastEvent).toBe('start')
  })

  it('is a no-op when already running', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const again = startTimer(running, T0 + 5_000)
    expect(again).toBe(running)
  })
})

describe('pauseTimer / resume', () => {
  it('freezes the remaining time and clears the end timestamp', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const paused = pauseTimer(running, T0 + 10_000)
    expect(paused.status).toBe('paused')
    expect(paused.endTimestamp).toBeNull()
    expect(paused.remainingMs).toBe(25 * 60_000 - 10_000)
    expect(paused.lastEvent).toBe('pause')
  })

  it('is a no-op when not running', () => {
    const idle = createInitialState(settings())
    expect(pauseTimer(idle, T0)).toBe(idle)
  })

  it('resumes from the exact remaining time, not from a full duration', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const paused = pauseTimer(running, T0 + 10_000)
    const resumed = startTimer(paused, T0 + 60_000)
    expect(resumed.status).toBe('running')
    expect(resumed.endTimestamp).toBe(T0 + 60_000 + (25 * 60_000 - 10_000))
  })
})

describe('getRemainingMs', () => {
  it('derives remaining time from now while running', () => {
    const running = startTimer(createInitialState(settings()), T0)
    expect(getRemainingMs(running, T0 + 4_000)).toBe(25 * 60_000 - 4_000)
  })

  it('never goes below zero even if now is past the end timestamp', () => {
    const running = startTimer(createInitialState(settings()), T0)
    expect(getRemainingMs(running, T0 + 999_999_999)).toBe(0)
  })

  it('returns the frozen remainingMs while paused', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const paused = pauseTimer(running, T0 + 10_000)
    expect(getRemainingMs(paused, T0 + 999_999)).toBe(25 * 60_000 - 10_000)
  })
})

describe('resetTimer', () => {
  it('returns to the initial focus state using the current settings', () => {
    const running = startTimer(createInitialState(settings({ focusMinutes: 10 })), T0)
    const reset = resetTimer(running)
    expect(reset.mode).toBe('focus')
    expect(reset.status).toBe('idle')
    expect(reset.sessionNumber).toBe(1)
    expect(reset.completedFocusSessions).toBe(0)
    expect(reset.remainingMs).toBe(10 * 60_000)
    expect(reset.lastEvent).toBe('reset')
  })
})

describe('skipSegment', () => {
  it('moves from focus to a short break with a fresh duration', () => {
    const state = skipSegment(createInitialState(settings()), T0)
    expect(state.mode).toBe('shortBreak')
    expect(state.remainingMs).toBe(5 * 60_000)
    expect(state.completedFocusSessions).toBe(1)
    expect(state.lastEvent).toBe('skip')
  })

  it('moves to a long break on the last focus session of the cycle', () => {
    const custom = settings({ sessionsBeforeLongBreak: 2 })
    let state = createInitialState(custom)
    state = skipSegment(state, T0) // session 1 -> short break
    state = skipSegment(state, T0) // short break -> focus session 2
    state = skipSegment(state, T0) // session 2 -> long break
    expect(state.mode).toBe('longBreak')
    expect(state.completedFocusSessions).toBe(2)
  })

  it('preserves the running status across the skip', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const skipped = skipSegment(running, T0 + 1_000)
    expect(skipped.status).toBe('running')
    expect(skipped.endTimestamp).toBe(T0 + 1_000 + 5 * 60_000)
  })

  it('stays idle when skipping before the timer has ever started', () => {
    const idle = createInitialState(settings())
    const skipped = skipSegment(idle, T0)
    expect(skipped.status).toBe('idle')
    expect(skipped.endTimestamp).toBeNull()
  })
})

describe('tick', () => {
  it('does nothing before the segment ends', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const same = tick(running, T0 + 1_000)
    expect(same).toBe(running)
  })

  it('is a no-op while paused or idle', () => {
    const idle = createInitialState(settings())
    expect(tick(idle, T0 + 999_999)).toBe(idle)

    const paused = pauseTimer(startTimer(idle, T0), T0 + 10_000)
    expect(tick(paused, T0 + 999_999)).toBe(paused)
  })

  it('transitions from focus to short break exactly at the end timestamp (boundary)', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const finished = tick(running, T0 + 25 * 60_000)
    expect(finished.mode).toBe('shortBreak')
    expect(finished.status).toBe('running')
    expect(finished.lastEvent).toBe('auto-advance')
    expect(finished.endTimestamp).toBe(T0 + 25 * 60_000 + 5 * 60_000)
  })

  it('also transitions when now is well past the end timestamp', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const finished = tick(running, T0 + 999_999_999)
    expect(finished.mode).toBe('shortBreak')
  })

  it('transitions from focus to long break on the last session of the cycle', () => {
    const custom = settings({ sessionsBeforeLongBreak: 2, focusMinutes: 1, shortBreakMinutes: 1 })
    let state = startTimer(createInitialState(custom), T0)
    state = tick(state, T0 + 60_000) // session 1 focus -> short break
    expect(state.mode).toBe('shortBreak')

    state = tick(state, state.endTimestamp as number) // short break -> focus session 2
    expect(state.mode).toBe('focus')
    expect(state.sessionNumber).toBe(2)

    state = tick(state, (state.endTimestamp as number)) // session 2 focus -> long break
    expect(state.mode).toBe('longBreak')
    expect(state.completedFocusSessions).toBe(2)
  })

  it('resets the session counter to 1 after a long break finishes', () => {
    const custom = settings({ sessionsBeforeLongBreak: 2, focusMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 1 })
    let state = startTimer(createInitialState(custom), T0)
    state = tick(state, state.endTimestamp as number) // focus 1 -> short break
    state = tick(state, state.endTimestamp as number) // short break -> focus 2
    state = tick(state, state.endTimestamp as number) // focus 2 -> long break
    state = tick(state, state.endTimestamp as number) // long break -> focus (new cycle)

    expect(state.mode).toBe('focus')
    expect(state.sessionNumber).toBe(1)
    expect(state.completedFocusSessions).toBe(2)
  })

  it('keeps the session number unchanged across a short break', () => {
    const custom = settings({ focusMinutes: 1, shortBreakMinutes: 1 })
    let state = startTimer(createInitialState(custom), T0)
    state = tick(state, state.endTimestamp as number) // focus 1 -> short break
    expect(state.sessionNumber).toBe(1)
    state = tick(state, state.endTimestamp as number) // short break -> focus 2
    expect(state.sessionNumber).toBe(2)
  })
})

describe('applySettings', () => {
  it('applies new durations immediately while idle', () => {
    const idle = createInitialState(settings())
    const updated = applySettings(idle, settings({ focusMinutes: 45 }), T0)
    expect(updated.remainingMs).toBe(45 * 60_000)
    expect(updated.status).toBe('idle')
    expect(updated.lastEvent).toBe('settings')
  })

  it('does not corrupt a running segment, only affects future ones', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const midway = pauseTimer(running, T0 + 10_000) // remainingMs frozen at 25min - 10s
    const updated = applySettings(midway, settings({ focusMinutes: 45 }), T0 + 10_000)

    expect(updated.status).toBe('paused')
    expect(updated.remainingMs).toBe(25 * 60_000 - 10_000)
    expect(updated.settings.focusMinutes).toBe(45)
  })

  it('uses the updated settings for the next segment after the current one ends', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const updated = applySettings(running, settings({ shortBreakMinutes: 20 }), T0 + 1_000)
    const finished = tick(updated, T0 + 25 * 60_000)
    expect(finished.mode).toBe('shortBreak')
    expect(finished.remainingMs).toBe(20 * 60_000)
  })
})

describe('clampSettings', () => {
  it('clamps values within the documented min/max bounds', () => {
    const clamped = clampSettings({
      focusMinutes: 999,
      shortBreakMinutes: 0,
      longBreakMinutes: -5,
      sessionsBeforeLongBreak: 1,
    })
    expect(clamped.focusMinutes).toBe(90)
    expect(clamped.shortBreakMinutes).toBe(1)
    expect(clamped.longBreakMinutes).toBe(1)
    expect(clamped.sessionsBeforeLongBreak).toBe(2)
  })

  it('falls back to the minimum for non-finite values', () => {
    const clamped = clampSettings({
      focusMinutes: Number.NaN,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4,
    })
    expect(clamped.focusMinutes).toBe(1)
  })

  it('leaves already-valid values untouched', () => {
    expect(clampSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS)
  })
})

describe('durationMsFor', () => {
  it('maps each mode to the matching setting', () => {
    const custom = settings({ focusMinutes: 30, shortBreakMinutes: 6, longBreakMinutes: 18 })
    expect(durationMsFor('focus', custom)).toBe(30 * 60_000)
    expect(durationMsFor('shortBreak', custom)).toBe(6 * 60_000)
    expect(durationMsFor('longBreak', custom)).toBe(18 * 60_000)
  })
})

describe('getProgress', () => {
  it('is 0 at the very start of a segment', () => {
    const running = startTimer(createInitialState(settings()), T0)
    expect(getProgress(running, T0)).toBe(0)
  })

  it('is 0.5 halfway through a segment', () => {
    const running = startTimer(createInitialState(settings({ focusMinutes: 10 })), T0)
    expect(getProgress(running, T0 + 5 * 60_000)).toBeCloseTo(0.5, 5)
  })

  it('is capped at 1 once the segment is over', () => {
    const running = startTimer(createInitialState(settings()), T0)
    expect(getProgress(running, T0 + 999_999_999)).toBe(1)
  })
})

describe('formatTime', () => {
  it('formats minutes and seconds with zero-padding', () => {
    expect(formatTime(25 * 60_000)).toBe('25:00')
    expect(formatTime(65_000)).toBe('01:05')
    expect(formatTime(0)).toBe('00:00')
  })

  it('rounds up partial seconds so the display never shows a stale 0', () => {
    expect(formatTime(500)).toBe('00:01')
  })

  it('never displays a negative time', () => {
    expect(formatTime(-5_000)).toBe('00:00')
  })
})

describe('regression: the displayed remaining time must always use a live "now", never a cached one', () => {
  // Reproduces the root cause of the "timer briefly jumps then snaps back" bug: the
  // React layer used to cache "now" in its own state, updated only by the interval
  // (see usePomodoroTimer.ts). Pressing start/resume set a fresh `endTimestamp` via
  // Date.now(), but the next render still read the OLD cached `now` until the interval
  // caught up ~250ms later. Because that cached `now` was older than the timestamp
  // actually used to compute `endTimestamp`, `getRemainingMs` briefly overstated the
  // remaining time. These tests pin the underlying arithmetic so the pure engine keeps
  // this invariant: a stale (older) `now` must always overstate remaining time compared
  // to a fresh one, which is exactly why the hook now derives `now` live at call time
  // instead of caching it across renders.
  it('an older cached now overstates remaining time compared to a fresh now', () => {
    const idle = createInitialState(settings())
    const staleNow = T0 - 5_000 // a `now` snapshot captured before the user pressed start
    const running = startTimer(idle, T0)

    const staleRemaining = getRemainingMs(running, staleNow)
    const freshRemaining = getRemainingMs(running, T0)

    expect(staleRemaining).toBeGreaterThan(freshRemaining)
    expect(freshRemaining).toBe(25 * 60_000)
  })

  it('resuming and reading remaining time at the exact resume instant shows no jump', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const paused = pauseTimer(running, T0 + 10_000)
    const resumeAt = T0 + 60_000
    const resumed = startTimer(paused, resumeAt)

    // Read with the same timestamp the resume itself used (what a live Date.now() call
    // at render time would produce) — must equal exactly what was frozen at pause,
    // never more and never less.
    expect(getRemainingMs(resumed, resumeAt)).toBe(25 * 60_000 - 10_000)
  })

  it('reading remaining time a moment after resume only decreases by real elapsed time', () => {
    const running = startTimer(createInitialState(settings()), T0)
    const paused = pauseTimer(running, T0 + 10_000)
    const resumed = startTimer(paused, T0 + 60_000)

    const remainingAtResume = getRemainingMs(resumed, T0 + 60_000)
    const remainingSoonAfter = getRemainingMs(resumed, T0 + 60_250)

    expect(remainingAtResume - remainingSoonAfter).toBe(250)
  })
})

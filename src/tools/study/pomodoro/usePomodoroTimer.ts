import { useCallback, useEffect, useState } from 'react'
import {
  applySettings,
  clampSettings,
  createInitialState,
  formatTime,
  getProgress,
  getRemainingMs,
  pauseTimer,
  resetTimer,
  skipSegment,
  startTimer,
  tick,
  type PomodoroSettings,
  type PomodoroState,
} from './calculate'

/**
 * Interval used only to trigger re-renders while running (so the countdown keeps
 * moving even on ticks where nothing actually transitions). The value used for every
 * time calculation is always read fresh via `Date.now()` at render/call time — never
 * cached in state — so it can never go stale relative to a state change that just
 * happened (e.g. pressing start/resume). Caching "now" in its own state previously
 * caused a one-render flash: the click updated `state.endTimestamp` from a fresh
 * timestamp, but the display kept reading an older cached "now" until the next
 * interval tick corrected it, producing a brief jump to a wrong value.
 */
const TICK_INTERVAL_MS = 250

export function usePomodoroTimer(initialSettings: PomodoroSettings) {
  const [state, setState] = useState<PomodoroState>(() => createInitialState(initialSettings))
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (state.status !== 'running') return

    const id = window.setInterval(() => {
      const current = Date.now()
      setState((prev) => tick(prev, current))
      // tick() returns the same reference when nothing transitioned, which makes
      // React bail out of re-rendering — but the countdown still needs to visibly
      // move every tick, so force one regardless of whether state itself changed.
      forceRender((n) => n + 1)
    }, TICK_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [state.status])

  // Recompute immediately when the tab regains focus, so a throttled background
  // interval doesn't leave a stale countdown or a missed transition on screen.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      const current = Date.now()
      setState((prev) => tick(prev, current))
      forceRender((n) => n + 1)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const start = useCallback(() => setState((prev) => startTimer(prev, Date.now())), [])
  const pause = useCallback(() => setState((prev) => pauseTimer(prev, Date.now())), [])
  const reset = useCallback(() => setState((prev) => resetTimer(prev)), [])
  const skip = useCallback(() => setState((prev) => skipSegment(prev, Date.now())), [])

  const updateSettings = useCallback((settings: PomodoroSettings) => {
    setState((prev) => applySettings(prev, clampSettings(settings), Date.now()))
  }, [])

  // Always derived from a live timestamp taken during this render, never from a
  // value stored on a previous render — this is the actual fix for the jump bug.
  const now = Date.now()
  const remainingMs = getRemainingMs(state, now)

  return {
    state,
    remainingMs,
    progress: getProgress(state, now),
    formattedTime: formatTime(remainingMs),
    start,
    pause,
    reset,
    skip,
    updateSettings,
  }
}

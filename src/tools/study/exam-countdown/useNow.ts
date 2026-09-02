import { useEffect, useState } from 'react'

/**
 * The countdown only displays minute-level granularity, so a long interval is plenty
 * — this just needs to force periodic re-renders, not drive any timing logic itself.
 */
const TICK_INTERVAL_MS = 15_000

/**
 * Returns a fresh `Date.now()` value on every render and forces a re-render every
 * `intervalMs`, plus immediately whenever the tab regains focus.
 *
 * Deliberately never caches the timestamp in state across renders (unlike an earlier,
 * buggy version of the Pomodoro timer's clock): if "now" were stored and only updated
 * by the interval, an external change on the same render tick could briefly read a
 * stale value before the next tick corrected it. Reading `Date.now()` directly at
 * call time avoids that entirely — the interval/visibility listeners only exist to
 * trigger the re-render, never to supply the value itself.
 */
export function useNow(intervalMs: number = TICK_INTERVAL_MS): number {
  const [, forceRender] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => forceRender((n) => n + 1), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        forceRender((n) => n + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return Date.now()
}

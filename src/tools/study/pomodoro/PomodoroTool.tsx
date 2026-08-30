import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipForward, SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { DEFAULT_SETTINGS, SETTINGS_LIMITS, type PomodoroMode } from './calculate'
import { usePomodoroTimer } from './usePomodoroTimer'
import { playSessionChime } from './sound'
import type { TranslationDict } from '../../../i18n/pt-PT'

function getModeLabel(mode: PomodoroMode, t: TranslationDict): string {
  if (mode === 'focus') return t.pomodoro.modeFocus
  if (mode === 'shortBreak') return t.pomodoro.modeShortBreak
  return t.pomodoro.modeLongBreak
}

export function PomodoroTool() {
  const t = useI18n()
  const { state, progress, formattedTime, start, pause, reset, skip, updateSettings } =
    usePomodoroTimer(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draftSettings, setDraftSettings] = useState(state.settings)
  const [announcement, setAnnouncement] = useState('')
  const originalTitleRef = useRef<string | null>(null)
  const settingsPanelId = 'pomodoro-settings-panel'

  const modeLabel = getModeLabel(state.mode, t)
  const { sessionsBeforeLongBreak } = state.settings

  // Capture the tool page's own title once, so we can restore it exactly.
  useEffect(() => {
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title
    }
    return () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current
      }
    }
  }, [])

  useEffect(() => {
    if (state.status === 'running') {
      document.title = `${formattedTime} — ${modeLabel} | NotaLab`
    } else if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current
    }
  }, [state.status, formattedTime, modeLabel])

  // Runs only when the engine actually produced a new state (see usePomodoroTimer /
  // calculate.ts), so this never fires on every second, only on real transitions.
  useEffect(() => {
    switch (state.lastEvent) {
      case 'start':
        setAnnouncement(t.pomodoro.announceStart(modeLabel))
        break
      case 'resume':
        setAnnouncement(t.pomodoro.announceResume(modeLabel))
        break
      case 'pause':
        setAnnouncement(t.pomodoro.announcePause)
        break
      case 'reset':
        setAnnouncement(t.pomodoro.announceReset)
        break
      case 'skip':
        setAnnouncement(t.pomodoro.announceSkip(modeLabel))
        break
      case 'auto-advance':
        setAnnouncement(t.pomodoro.announceAutoAdvance(modeLabel))
        playSessionChime()
        break
      default:
        break
    }
    // Intentionally depends on the whole state object: it only changes reference when
    // the engine actually produces a new state (see calculate.ts), so this can't fire
    // on every tick, only on real transitions.
  }, [state, t, modeLabel])

  // Re-sync the editable draft with the committed settings each time the panel is opened,
  // so edits always start from the current values without fighting a controlled input
  // that re-clamps on every keystroke.
  function openSettings() {
    setDraftSettings(state.settings)
    setSettingsOpen(true)
  }

  function commitDraftField(patch: Partial<typeof draftSettings>) {
    const next = { ...draftSettings, ...patch }
    setDraftSettings(next)
    updateSettings(next)
  }

  const completedInCycle = state.mode === 'focus' ? state.sessionNumber - 1 : state.sessionNumber
  const dots = Array.from({ length: sessionsBeforeLongBreak }, (_, index) => index < completedInCycle)

  const isRunning = state.status === 'running'
  const isPaused = state.status === 'paused'

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-ink-200 bg-ink-50 p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
            {modeLabel}
          </span>
          <span className="text-sm font-medium text-ink-600">
            {t.pomodoro.sessionLabel(state.sessionNumber, sessionsBeforeLongBreak)}
          </span>
        </div>

        <p
          className="mt-6 text-center font-semibold tabular-nums text-ink-950"
          style={{ fontSize: 'clamp(3rem, 12vw, 5rem)' }}
        >
          {formattedTime}
        </p>

        <div
          role="progressbar"
          aria-label={t.pomodoro.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {dots.map((filled, index) => (
            <span
              key={index}
              className={`h-2 w-2 rounded-full ${filled ? 'bg-brand-600' : 'bg-ink-200'}`}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={isRunning ? pause : start} className="min-w-32">
            {isRunning ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {isRunning ? t.pomodoro.pause : isPaused ? t.pomodoro.resume : t.pomodoro.start}
          </Button>
          <Button type="button" variant="secondary" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.pomodoro.reset}
          </Button>
          <Button type="button" variant="secondary" onClick={skip}>
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            {t.pomodoro.skip}
          </Button>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => (settingsOpen ? setSettingsOpen(false) : openSettings())}
          aria-expanded={settingsOpen}
          aria-controls={settingsPanelId}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t.pomodoro.settingsToggle}
        </Button>

        {settingsOpen && (
          <div id={settingsPanelId} className="mt-4 rounded-lg border border-ink-200 p-4">
            {state.status !== 'idle' && (
              <p className="mb-4 text-sm text-ink-600">{t.pomodoro.settingsRunningHint}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t.pomodoro.focusDuration}
                type="number"
                min={SETTINGS_LIMITS.focusMinutes.min}
                max={SETTINGS_LIMITS.focusMinutes.max}
                value={draftSettings.focusMinutes}
                onChange={(e) =>
                  setDraftSettings((prev) => ({ ...prev, focusMinutes: Number(e.target.value) }))
                }
                onBlur={(e) => commitDraftField({ focusMinutes: Number(e.target.value) })}
              />
              <Field
                label={t.pomodoro.shortBreakDuration}
                type="number"
                min={SETTINGS_LIMITS.shortBreakMinutes.min}
                max={SETTINGS_LIMITS.shortBreakMinutes.max}
                value={draftSettings.shortBreakMinutes}
                onChange={(e) =>
                  setDraftSettings((prev) => ({ ...prev, shortBreakMinutes: Number(e.target.value) }))
                }
                onBlur={(e) => commitDraftField({ shortBreakMinutes: Number(e.target.value) })}
              />
              <Field
                label={t.pomodoro.longBreakDuration}
                type="number"
                min={SETTINGS_LIMITS.longBreakMinutes.min}
                max={SETTINGS_LIMITS.longBreakMinutes.max}
                value={draftSettings.longBreakMinutes}
                onChange={(e) =>
                  setDraftSettings((prev) => ({ ...prev, longBreakMinutes: Number(e.target.value) }))
                }
                onBlur={(e) => commitDraftField({ longBreakMinutes: Number(e.target.value) })}
              />
              <Field
                label={t.pomodoro.sessionsBeforeLongBreak}
                type="number"
                min={SETTINGS_LIMITS.sessionsBeforeLongBreak.min}
                max={SETTINGS_LIMITS.sessionsBeforeLongBreak.max}
                value={draftSettings.sessionsBeforeLongBreak}
                onChange={(e) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    sessionsBeforeLongBreak: Number(e.target.value),
                  }))
                }
                onBlur={(e) =>
                  commitDraftField({ sessionsBeforeLongBreak: Number(e.target.value) })
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.pomodoro.howItWorks}</p>
      </div>
    </div>
  )
}

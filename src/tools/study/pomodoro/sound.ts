/**
 * Plays a short two-tone chime using the Web Audio API only — no audio files,
 * no external services. Fails silently if audio is unavailable or blocked
 * (autoplay restrictions, unsupported browser, etc.).
 */
export function playSessionChime() {
  if (typeof window === 'undefined') return

  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) return

  try {
    const context = new AudioContextClass()
    const startTime = context.currentTime

    ;[880, 1175].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const toneStart = startTime + index * 0.18

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      gain.gain.setValueAtTime(0.0001, toneStart)
      gain.gain.exponentialRampToValueAtTime(0.25, toneStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.35)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(toneStart)
      oscillator.stop(toneStart + 0.4)
    })

    window.setTimeout(() => {
      context.close().catch(() => {
        // Closing can fail if the context is already closed; nothing to do about it.
      })
    }, 900)
  } catch {
    // Audio playback can fail for reasons outside our control. Fail silently.
  }
}

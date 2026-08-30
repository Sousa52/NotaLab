import { useId, useState } from 'react'
import { Copy, Check, Eraser } from 'lucide-react'
import { Button } from '../../../components/Button'
import { useI18n } from '../../../i18n'
import { analyzeText } from './calculate'

export function WordCounterTool() {
  const t = useI18n()
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const textareaId = useId()
  const statsRegionId = useId()

  const stats = analyzeText(text)
  const isEmpty = text === ''

  async function handleCopy() {
    if (isEmpty) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can fail (permissions, insecure context). Fail silently; the
      // text is still visible and selectable in the textarea as a fallback.
    }
  }

  function handleClear() {
    setText('')
    setCopied(false)
  }

  const statItems: { key: string; label: string; value: number }[] = [
    { key: 'words', label: t.textCounter.words, value: stats.words },
    { key: 'characters', label: t.textCounter.characters, value: stats.characters },
    { key: 'charactersNoSpaces', label: t.textCounter.charactersNoSpaces, value: stats.charactersNoSpaces },
    { key: 'sentences', label: t.textCounter.sentences, value: stats.sentences },
    { key: 'paragraphs', label: t.textCounter.paragraphs, value: stats.paragraphs },
    { key: 'lines', label: t.textCounter.lines, value: stats.lines },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={textareaId} className="text-sm font-medium text-ink-800">
          {t.textCounter.textareaLabel}
        </label>
        <textarea
          id={textareaId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.textCounter.textareaPlaceholder}
          rows={12}
          aria-describedby={statsRegionId}
          className="min-h-[240px] w-full resize-y rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-950 placeholder:text-ink-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={handleClear} disabled={isEmpty}>
          <Eraser className="h-4 w-4" aria-hidden="true" />
          {t.common.clear}
        </Button>
        <Button type="button" variant="secondary" onClick={handleCopy} disabled={isEmpty}>
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? t.textCounter.copied : t.textCounter.copy}
        </Button>
      </div>

      <div id={statsRegionId} aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {statItems.map((item) => (
          <div key={item.key} className="rounded-lg border border-ink-200 bg-ink-50 p-4">
            <p className="text-sm font-medium text-ink-600">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink-950">{item.value}</p>
          </div>
        ))}
      </div>

      {isEmpty && <p className="text-sm text-ink-600">{t.textCounter.emptyState}</p>}

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.textCounter.howItWorks}</p>
      </div>
    </div>
  )
}

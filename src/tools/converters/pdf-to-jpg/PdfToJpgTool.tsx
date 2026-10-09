import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { CircleAlert, CircleCheck, Download, FileImage, FileText, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { Button } from '../../../components/Button'
import { useI18n } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { MAX_FILE_SIZE_BYTES, formatFileSize } from '../jpg-to-png/convert'
import { downloadBlob } from '../jpg-to-png/convertImage'
import {
  DEFAULT_RESOLUTION_ID,
  MAX_PDF_PAGES,
  RESOLUTION_OPTIONS,
  getResolution,
  validatePdfFile,
  type OpenErrorCode,
  type PdfValidationErrorCode,
  type RenderErrorCode,
  type ResolutionId,
} from './convert'
import { convertPages, packagePages, type ConvertPagesResult, type PageImage } from './process'
import { openPdf } from './render'

const ACCEPT = '.pdf,application/pdf'
const MAX_FILE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024)

const LINK_BUTTON_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'

type Strings = ReturnType<typeof useI18n>['pdfToJpg']
type SourceStatus = 'checking' | 'ready' | 'error'
type SourceErrorCode = PdfValidationErrorCode | OpenErrorCode

interface Source {
  id: string
  file: File
  status: SourceStatus
  pageCount?: number
  error?: SourceErrorCode
}

interface ConvertError {
  code: OpenErrorCode | RenderErrorCode
  /** Set when one particular page could not be converted. */
  pageNumber?: number
}

let idCounter = 0
function nextId() {
  idCounter += 1
  return `pdf-to-jpg-${idCounter}`
}

function describeError(s: Strings, code: SourceErrorCode | RenderErrorCode): string {
  return code === 'tooManyPages' ? s.tooManyPages(MAX_PDF_PAGES) : s.errors[code]
}

/**
 * Creates an object URL for a blob and revokes it when the blob changes or the component
 * unmounts, so previews and download links never leak memory. Done in an effect (not
 * during render) so it also behaves correctly under React StrictMode.
 */
function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return undefined
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  return url
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
  hint?: string
  disabled?: boolean
}

/** Mirrors Field's visual language for a native <select>; kept local like in the other tools. */
function SelectField({ label, value, onChange, options, hint, disabled }: SelectFieldProps) {
  const selectId = useId()
  const hintId = hint ? `${selectId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-ink-800">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hintId}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="text-xs text-ink-600">
          {hint}
        </p>
      )}
    </div>
  )
}

interface SourceCardProps {
  source: Source
  onRemove: () => void
}

function SourceCard({ source, onRemove }: SourceCardProps) {
  const s = useI18n().pdfToJpg

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-ink-200 bg-ink-50">
          <FileText className="h-7 w-7 text-ink-400" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900" title={source.file.name}>
            {source.file.name}
          </p>
          <p className="mt-0.5 text-xs text-ink-600">
            {s.sizeLabel}: {formatFileSize(source.file.size)}
            {source.pageCount !== undefined && (
              <>
                {' · '}
                {s.pageCount(source.pageCount)}
              </>
            )}
          </p>

          {source.status === 'checking' && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-700">
              <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
              {s.statusChecking}
            </p>
          )}
          {source.status === 'ready' && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-green-700">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {s.statusReady}
            </p>
          )}
          {source.status === 'error' && (
            <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-red-700">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {describeError(s, source.error ?? 'loadFailed')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label={s.removeFile(source.file.name)}
          className="shrink-0 rounded-md p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function PagePreview({ page }: { page: PageImage }) {
  const s = useI18n().pdfToJpg
  const previewUrl = useObjectUrl(page.blob)

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-ink-200 bg-white p-3">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border border-ink-200 bg-ink-50">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={s.previewAlt(page.pageNumber)}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        ) : (
          <FileImage className="h-8 w-8 text-ink-400" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">{s.pageLabel(page.pageNumber)}</p>
        <p className="text-xs text-ink-600">
          {s.dimensions(page.width, page.height)}
          {' · '}
          {formatFileSize(page.blob.size)}
        </p>
      </div>
      {previewUrl ? (
        <a
          href={previewUrl}
          download={page.fileName}
          aria-label={s.downloadPage(page.fileName)}
          className={LINK_BUTTON_CLASSES}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {s.download}
        </a>
      ) : (
        <Button type="button" variant="secondary" size="sm" disabled>
          <Download className="h-4 w-4" aria-hidden="true" />
          {s.download}
        </Button>
      )}
    </li>
  )
}

export function PdfToJpgTool() {
  const t = useI18n()
  const s = t.pdfToJpg
  const inputId = useId()
  const formatsId = useId()

  const [source, setSource] = useState<Source | null>(null)
  const [resolutionId, setResolutionId] = useState<ResolutionId>(DEFAULT_RESOLUTION_ID)
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [pages, setPages] = useState<PageImage[]>([])
  const [resultDpi, setResultDpi] = useState<number | null>(null)
  const [convertError, setConvertError] = useState<ConvertError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPackaging, setIsPackaging] = useState(false)
  const [downloadFailed, setDownloadFailed] = useState(false)

  // The conversion is async, so it checks whether it is still the current run (and whether the
  // tool is still mounted) through refs instead of a stale closure. Removing or replacing the
  // PDF starts a new "run", which cancels the one in progress.
  const aliveRef = useRef(true)
  const runRef = useRef(0)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const selectedDpi = getResolution(resolutionId).dpi
  const isReady = source?.status === 'ready'

  function clearResults() {
    setPages([])
    setResultDpi(null)
    setConvertError(null)
    setDownloadFailed(false)
  }

  /** Cancels any conversion in progress. */
  function cancelRun() {
    runRef.current += 1
    setIsConverting(false)
    setProgress(null)
  }

  /** Opens the PDF just to count its pages and catch unusable files early. */
  async function inspect(id: string, file: File) {
    const opened = await openPdf(file)
    if (opened.status === 'error') {
      if (!aliveRef.current) return
      setSource((current) => (current?.id === id ? { ...current, status: 'error', error: opened.code } : current))
      return
    }

    const { pageCount } = opened.pdf
    await opened.pdf.destroy()
    if (!aliveRef.current) return
    setSource((current) => (current?.id === id ? { ...current, status: 'ready', pageCount } : current))
  }

  function addFiles(incoming: File[]) {
    const [file] = incoming
    if (!file) return

    cancelRun()
    clearResults()
    const ignored = incoming.length - 1
    setNotice(ignored > 0 ? s.onlyOneFile(ignored) : null)

    const id = nextId()
    const validation = validatePdfFile(file)
    if (validation.status === 'error') {
      setSource({ id, file, status: 'error', error: validation.code })
      return
    }

    setSource({ id, file, status: 'checking' })
    void inspect(id, file)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []))
    // Allow choosing the same file again after removing it.
    event.target.value = ''
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    // Ignore the event fired when the pointer moves onto a child of the drop zone.
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(event.dataTransfer.files))
  }

  function handleRemove() {
    cancelRun()
    clearResults()
    setSource(null)
    setNotice(null)
  }

  async function handleConvert() {
    if (!source || source.status !== 'ready' || isConverting) return
    const { file } = source
    const dpi = selectedDpi

    runRef.current += 1
    const runId = runRef.current
    const isCurrent = () => aliveRef.current && runRef.current === runId

    setIsConverting(true)
    setProgress(null)
    clearResults()

    const opened = await openPdf(file)
    if (!isCurrent()) {
      if (opened.status === 'ok') await opened.pdf.destroy()
      return
    }
    if (opened.status === 'error') {
      setConvertError({ code: opened.code })
      setIsConverting(false)
      return
    }

    let result: ConvertPagesResult
    try {
      // One page at a time keeps peak memory low, and the PDF is always closed afterwards.
      result = await convertPages(opened.pdf, {
        pdfName: file.name,
        dpi,
        isCancelled: () => !isCurrent(),
        onProgress: (current, total) => {
          if (isCurrent()) setProgress({ current, total })
        },
        // Let the browser paint between pages.
        pause: () => new Promise<void>((resolve) => window.setTimeout(resolve, 0)),
      })
    } finally {
      await opened.pdf.destroy()
    }
    if (!isCurrent()) return

    setIsConverting(false)
    setProgress(null)
    if (result.status === 'ok') {
      setPages(result.pages)
      setResultDpi(dpi)
    } else if (result.status === 'error') {
      setConvertError({ code: result.code, pageNumber: result.pageNumber })
    }
  }

  async function handleDownload() {
    if (!source || pages.length === 0) return

    setIsPackaging(true)
    setDownloadFailed(false)
    try {
      const download = await packagePages(pages, source.file.name)
      downloadBlob(download.blob, download.fileName)
    } catch {
      if (aliveRef.current) setDownloadFailed(true)
    } finally {
      if (aliveRef.current) setIsPackaging(false)
    }
  }

  const hasResult = pages.length > 0
  const resultIsOutdated = hasResult && resultDpi !== null && resultDpi !== selectedDpi

  return (
    <div className="space-y-6">
      <label
        htmlFor={inputId}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600',
          isDragging ? 'border-brand-600 bg-ink-100' : 'border-ink-200 bg-ink-50 hover:bg-ink-100',
        )}
      >
        <Upload className="h-8 w-8 text-ink-400" aria-hidden="true" />
        <span className="text-sm font-medium text-ink-900">{s.dropTitle}</span>
        <span className="text-sm text-ink-600">{s.dropHint}</span>
        <span id={formatsId} className="text-xs text-ink-600">
          {s.dropFormats(MAX_FILE_MB, MAX_PDF_PAGES)}
        </span>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          aria-describedby={formatsId}
          onChange={handleInputChange}
          className="sr-only"
        />
      </label>

      {source && <SourceCard source={source} onRemove={handleRemove} />}

      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <SelectField
          label={s.resolutionLabel}
          value={resolutionId}
          disabled={isConverting}
          onChange={(value) => setResolutionId(getResolution(value).id)}
          hint={s.resolutionHint}
          options={RESOLUTION_OPTIONS.map((option) => ({ id: option.id, label: s.resolutionOptions[option.id] }))}
        />
      </div>

      <p className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-700">{s.pageNote}</p>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleConvert} disabled={!isReady || isConverting}>
          {isConverting ? (
            <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <FileImage className="h-4 w-4" aria-hidden="true" />
          )}
          {isConverting ? s.converting : hasResult ? s.convertAgain : s.convertButton}
        </Button>
        {hasResult && (
          <Button type="button" variant="secondary" onClick={handleDownload} disabled={isPackaging || isConverting}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {pages.length === 1 ? s.downloadJpg : s.downloadZip}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={handleRemove} disabled={!source}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {s.clearSelection}
        </Button>
      </div>

      <div aria-live="polite" className="space-y-1 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">
        {!source && <p>{s.emptyState}</p>}
        {isConverting && <p>{progress ? s.progress(progress.current, progress.total) : s.preparing}</p>}
        {!isConverting && hasResult && resultDpi !== null && <p>{s.result(pages.length, resultDpi)}</p>}
        {!isConverting && resultIsOutdated && resultDpi !== null && <p>{s.resultOutdated(resultDpi, selectedDpi)}</p>}
        {convertError && (
          <p className="font-medium text-red-700">
            {convertError.pageNumber !== undefined
              ? s.pageFailed(convertError.pageNumber, describeError(s, convertError.code))
              : describeError(s, convertError.code)}
          </p>
        )}
        {isPackaging && pages.length > 1 && <p>{s.zipping}</p>}
        {notice && <p>{notice}</p>}
        {downloadFailed && <p className="font-medium text-red-700">{s.zipFailed}</p>}
      </div>

      {hasResult && (
        <section>
          <p className="mb-3 text-sm font-medium text-ink-800">{s.listTitle(pages.length)}</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((page) => (
              <PagePreview key={page.pageNumber} page={page} />
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-ink-600">{t.common.processedLocally}</p>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">{s.howItWorksTitle}</h2>
        <p className="mt-2">{s.howItWorks}</p>
      </div>
    </div>
  )
}

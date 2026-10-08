import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Clock,
  Download,
  FileImage,
  FileText,
  LoaderCircle,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '../../../components/Button'
import { useI18n } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { MAX_FILES, MAX_FILE_SIZE_BYTES, formatFileSize } from '../jpg-to-png/convert'
import { downloadBlob } from '../jpg-to-png/convertImage'
import {
  PDF_FILE_NAME,
  moveItem,
  takeAvailableSlots,
  validateImageFile,
  type ImageValidationErrorCode,
} from './convert'
import { prepareImageForPdf, type PrepareErrorCode } from './convertImage'
import { fitImageToPage } from './layout'
import { createPdf, type PdfPageInput } from './pdf'

const ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const MAX_FILE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024)

type ItemStatus = 'ready' | 'processing' | 'done' | 'error'
type ItemErrorCode = ImageValidationErrorCode | PrepareErrorCode

interface Item {
  id: string
  file: File
  status: ItemStatus
  error?: ItemErrorCode
  width?: number
  height?: number
}

interface PdfResult {
  blob: Blob
  pages: number
}

let idCounter = 0
function nextId() {
  idCounter += 1
  return `images-to-pdf-${idCounter}`
}

/**
 * Creates an object URL for a blob and revokes it when the blob changes or the component
 * unmounts, so previews never leak memory. Done in an effect (not during render) so it also
 * behaves correctly under React StrictMode.
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

function StatusLine({ item }: { item: Item }) {
  const s = useI18n().imagesToPdf

  if (item.status === 'ready') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-600">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {s.statusReady}
      </p>
    )
  }
  if (item.status === 'processing') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-700">
        <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
        {s.statusProcessing}
      </p>
    )
  }
  if (item.status === 'done') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-green-700">
        <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {s.statusDone}
      </p>
    )
  }
  return (
    <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-red-700">
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {s.errors[item.error ?? 'decodeFailed']}
    </p>
  )
}

const ICON_BUTTON_CLASSES =
  'rounded-md p-2 text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

interface ImageRowProps {
  item: Item
  /** Position of the image in the PDF; `null` for images that will not be included. */
  pageNumber: number | null
  isFirst: boolean
  isLast: boolean
  busy: boolean
  onMove: (id: string, delta: -1 | 1) => void
  onRemove: (id: string) => void
  onLoaded: (id: string, width: number, height: number) => void
  onUnreadable: (id: string) => void
}

function ImageRow({ item, pageNumber, isFirst, isLast, busy, onMove, onRemove, onLoaded, onUnreadable }: ImageRowProps) {
  const s = useI18n().imagesToPdf
  // Previews use the original file: JPG, PNG and WebP are raster images, safe to display.
  const previewUrl = useObjectUrl(item.status === 'error' ? undefined : item.file)
  const name = item.file.name

  return (
    <li className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-200 bg-ink-50">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={s.previewAlt(name)}
                loading="lazy"
                decoding="async"
                onLoad={(event) => onLoaded(item.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                onError={() => onUnreadable(item.id)}
                className="h-full w-full object-contain"
              />
            ) : (
              <FileImage className="h-8 w-8 text-ink-400" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {pageNumber !== null && <p className="text-xs font-semibold text-ink-700">{s.pageLabel(pageNumber)}</p>}
            <p className="truncate text-sm font-medium text-ink-900" title={name}>
              {name}
            </p>
            <p className="mt-0.5 text-xs text-ink-600">
              {formatFileSize(item.file.size)}
              {item.width !== undefined && item.height !== undefined && (
                <>
                  {' · '}
                  {s.dimensions(item.width, item.height)}
                </>
              )}
            </p>
            <StatusLine item={item} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {item.status !== 'error' && (
            <>
              <button
                type="button"
                id={`move-${item.id}-up`}
                onClick={() => onMove(item.id, -1)}
                disabled={busy || isFirst}
                aria-label={s.moveUp(name)}
                className={ICON_BUTTON_CLASSES}
              >
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                id={`move-${item.id}-down`}
                onClick={() => onMove(item.id, 1)}
                disabled={busy || isLast}
                aria-label={s.moveDown(name)}
                className={ICON_BUTTON_CLASSES}
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={busy}
            aria-label={s.removeFile(name)}
            className={cn(ICON_BUTTON_CLASSES, 'hover:text-red-600')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  )
}

export function ImagesToPdfTool() {
  const t = useI18n()
  const s = t.imagesToPdf
  const inputId = useId()
  const formatsId = useId()

  const [items, setItems] = useState<Item[]>([])
  const [result, setResult] = useState<PdfResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // The creation loop is async, so it reads the latest list (and whether the tool is still
  // mounted) from refs instead of from a stale closure.
  const itemsRef = useRef<Item[]>([])
  const aliveRef = useRef(true)
  const pendingFocus = useRef<{ id: string; preferred: 'up' | 'down' } | null>(null)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  // After a move, put keyboard focus back on the moved row's button (the row may have been
  // re-inserted in the DOM); if that direction is no longer possible, use the other one.
  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null

    const preferred = document.getElementById(`move-${target.id}-${target.preferred}`)
    const other = document.getElementById(`move-${target.id}-${target.preferred === 'up' ? 'down' : 'up'}`)
    const element = preferred instanceof HTMLButtonElement && !preferred.disabled ? preferred : other
    if (element instanceof HTMLButtonElement) element.focus()
  }, [items])

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  /**
   * Any change to the list invalidates a PDF that was already created, so rows that said
   * "included in the PDF" go back to "ready".
   */
  function resetResult() {
    setResult(null)
    setErrorMessage(null)
    setItems((current) =>
      current.some((item) => item.status === 'done')
        ? current.map((item): Item => (item.status === 'done' ? { ...item, status: 'ready' } : item))
        : current,
    )
  }

  function addFiles(incoming: File[]) {
    if (incoming.length === 0 || isCreating) return

    const { accepted, ignored } = takeAvailableSlots(incoming, items.length)

    const added = accepted.map((file): Item => {
      const validation = validateImageFile(file)
      const base = { id: nextId(), file }
      return validation.status === 'ok'
        ? { ...base, status: 'ready' }
        : { ...base, status: 'error', error: validation.code }
    })

    setItems((current) => [...current, ...added])
    setNotice(ignored > 0 ? s.tooManyFiles(MAX_FILES, ignored) : null)
    resetResult()
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

  function handleRemove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
    resetResult()
  }

  function handleClear() {
    setItems([])
    setNotice(null)
    setAnnouncement('')
    resetResult()
  }

  function handleLoaded(id: string, width: number, height: number) {
    if (width > 0 && height > 0) updateItem(id, { width, height })
  }

  function handleUnreadable(id: string) {
    // The preview could not be decoded, so the file cannot go in the PDF either.
    setItems((current) =>
      current.map((item): Item =>
        item.id === id && item.status !== 'error' ? { ...item, status: 'error', error: 'decodeFailed' } : item,
      ),
    )
    resetResult()
  }

  function handleMove(id: string, delta: -1 | 1) {
    const from = items.findIndex((item) => item.id === id)
    const to = from + delta
    const moved = items[from]
    if (!moved || to < 0 || to >= items.length) return

    const next = moveItem(items, from, to)
    setItems(next)
    resetResult()
    pendingFocus.current = { id, preferred: delta < 0 ? 'up' : 'down' }

    const included = next.filter((item) => item.status !== 'error')
    const position = next.slice(0, to + 1).filter((item) => item.status !== 'error').length
    setAnnouncement(s.moved(moved.file.name, position, included.length))
  }

  async function handleCreate() {
    if (isCreating) return
    // The page order is the list order at the moment the button is pressed.
    const queue = items.filter((item) => item.status !== 'error')
    if (queue.length === 0) {
      setErrorMessage(s.noPages)
      return
    }

    setIsCreating(true)
    setResult(null)
    setErrorMessage(null)
    setNotice(null)
    setAnnouncement('')

    const pages: PdfPageInput[] = []
    let skipped = 0
    let position = 0

    try {
      for (const entry of queue) {
        if (!aliveRef.current) return

        // The image may have been removed since the process started.
        if (!itemsRef.current.some((candidate) => candidate.id === entry.id)) continue

        position += 1
        setProgress({ current: position, total: queue.length })
        updateItem(entry.id, { status: 'processing', error: undefined })

        // One image at a time keeps peak memory low when many large images are queued.
        const prepared = await prepareImageForPdf(entry.file)
        if (!aliveRef.current) return

        const layout = prepared.status === 'ok' ? fitImageToPage(prepared.width, prepared.height) : null
        if (prepared.status === 'ok' && layout) {
          pages.push({ jpeg: prepared.jpeg, layout })
          updateItem(entry.id, { status: 'done' })
        } else {
          skipped += 1
          updateItem(entry.id, {
            status: 'error',
            error: prepared.status === 'error' ? prepared.code : 'conversionFailed',
          })
        }

        // Let the browser paint between images.
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }

      if (pages.length === 0) {
        setErrorMessage(s.noPages)
        return
      }

      const bytes = await createPdf(pages)
      if (!aliveRef.current) return
      setResult({ blob: new Blob([bytes], { type: 'application/pdf' }), pages: pages.length })
      if (skipped > 0) setNotice(s.skippedNotice(skipped))
    } catch {
      if (aliveRef.current) setErrorMessage(s.pdfFailed)
    } finally {
      if (aliveRef.current) {
        setIsCreating(false)
        setProgress(null)
      }
    }
  }

  // Page numbers count only the images that will be in the PDF.
  const includedCount = items.filter((item) => item.status !== 'error').length
  const rows = items.map((item, index) => ({
    item,
    pageNumber:
      item.status === 'error' ? null : items.slice(0, index + 1).filter((other) => other.status !== 'error').length,
    isFirst: index === 0,
    isLast: index === items.length - 1,
  }))

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
          {s.dropFormats(MAX_FILE_MB, MAX_FILES)}
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT}
          aria-describedby={formatsId}
          onChange={handleInputChange}
          className="sr-only"
        />
      </label>

      <div className="space-y-2 rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-700">
        <p>{s.orderNote}</p>
        <p>{s.pageNote}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleCreate} disabled={includedCount === 0 || isCreating}>
          {isCreating ? (
            <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="h-4 w-4" aria-hidden="true" />
          )}
          {isCreating ? s.creating : s.createButton}
        </Button>
        {result && (
          <Button type="button" variant="secondary" onClick={() => downloadBlob(result.blob, PDF_FILE_NAME)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {s.downloadPdf}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={handleClear} disabled={items.length === 0 || isCreating}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {s.clearSelection}
        </Button>
      </div>

      <div aria-live="polite" className="space-y-1 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">
        {items.length === 0 && <p>{s.emptyState}</p>}
        {isCreating && progress && <p>{s.progress(progress.current, progress.total)}</p>}
        {result && <p className="font-medium text-ink-900">{s.pdfReady(result.pages, formatFileSize(result.blob.size))}</p>}
        {announcement && <p>{announcement}</p>}
        {notice && <p>{notice}</p>}
        {errorMessage && <p className="font-medium text-red-700">{errorMessage}</p>}
      </div>

      {items.length > 0 && (
        <section>
          <p className="mb-3 text-sm font-medium text-ink-800">{s.listTitle(items.length)}</p>
          <ul className="space-y-3">
            {rows.map(({ item, pageNumber, isFirst, isLast }) => (
              <ImageRow
                key={item.id}
                item={item}
                pageNumber={pageNumber}
                isFirst={isFirst}
                isLast={isLast}
                busy={isCreating}
                onMove={handleMove}
                onRemove={handleRemove}
                onLoaded={handleLoaded}
                onUnreadable={handleUnreadable}
              />
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

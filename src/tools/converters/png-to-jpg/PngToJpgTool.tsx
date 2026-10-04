import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  CircleAlert,
  CircleCheck,
  Clock,
  Download,
  FileImage,
  ImageUp,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '../../../components/Button'
import { useI18n } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { MAX_FILES, MAX_FILE_SIZE_BYTES, formatFileSize } from '../jpg-to-png/convert'
import { downloadBlob, type ConvertErrorCode } from '../jpg-to-png/convertImage'
import { buildZip } from '../jpg-to-png/zip'
import {
  DEFAULT_QUALITY,
  MAX_QUALITY,
  MIN_QUALITY,
  clampQuality,
  getJpgFileName,
  toCanvasQuality,
  validatePngFile,
  type PngValidationErrorCode,
} from './convert'
import { convertPngToJpg } from './convertImage'
import { createZipEntries } from './zipEntries'

const ACCEPT = '.png,image/png'
const MAX_FILE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024)
const ZIP_FILE_NAME = 'imagens-jpg.zip'

const LINK_BUTTON_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'

type ItemStatus = 'pending' | 'converting' | 'done' | 'error'
type ItemErrorCode = PngValidationErrorCode | ConvertErrorCode

interface Item {
  id: string
  file: File
  outName: string
  status: ItemStatus
  error?: ItemErrorCode
  blob?: Blob
  width?: number
  height?: number
  /** JPEG quality (percent) this result was converted with. */
  quality?: number
}

let idCounter = 0
function nextId() {
  idCounter += 1
  return `png-to-jpg-${idCounter}`
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

function StatusLine({ item }: { item: Item }) {
  const s = useI18n().pngToJpg

  if (item.status === 'pending') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-600">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {s.statusPending}
      </p>
    )
  }
  if (item.status === 'converting') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-700">
        <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
        {s.statusConverting}
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
      {s.errors[item.error ?? 'conversionFailed']}
    </p>
  )
}

interface ImageRowProps {
  item: Item
  onRemove: (id: string) => void
}

function ImageRow({ item, onRemove }: ImageRowProps) {
  const s = useI18n().pngToJpg
  const previewUrl = useObjectUrl(item.status === 'done' ? item.blob : undefined)
  const isDone = item.status === 'done' && item.blob !== undefined

  return (
    <li className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-200 bg-ink-50">
            {previewUrl ? (
              <img src={previewUrl} alt={s.previewAlt(item.outName)} className="h-full w-full object-contain" />
            ) : (
              <FileImage className="h-8 w-8 text-ink-400" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900" title={item.file.name}>
              {item.file.name}
            </p>
            <p className="mt-0.5 text-xs text-ink-600">
              {s.originalLabel}: {formatFileSize(item.file.size)}
              {isDone && item.blob && (
                <>
                  {' · '}
                  {s.outputLabel}: {formatFileSize(item.blob.size)}
                  {item.width !== undefined && item.height !== undefined && (
                    <>
                      {' · '}
                      {s.dimensions(item.width, item.height)}
                    </>
                  )}
                  {item.quality !== undefined && (
                    <>
                      {' · '}
                      {s.rowQuality(item.quality)}
                    </>
                  )}
                </>
              )}
            </p>
            {isDone && (
              <p className="mt-0.5 truncate text-xs text-ink-600" title={item.outName}>
                {item.outName}
              </p>
            )}
            <StatusLine item={item} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isDone &&
            (previewUrl ? (
              <a
                href={previewUrl}
                download={item.outName}
                aria-label={s.downloadFile(item.outName)}
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
            ))}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={s.removeFile(item.file.name)}
            className="rounded-md p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  )
}

export function PngToJpgTool() {
  const t = useI18n()
  const s = t.pngToJpg
  const inputId = useId()
  const formatsId = useId()
  const qualityId = useId()
  const qualityHintId = useId()

  const [items, setItems] = useState<Item[]>([])
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isZipping, setIsZipping] = useState(false)
  const [zipFailed, setZipFailed] = useState(false)

  // The conversion loop is async, so it reads the latest list (and whether the tool is still
  // mounted) from refs instead of from a stale closure.
  const itemsRef = useRef<Item[]>([])
  const aliveRef = useRef(true)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return

    const room = Math.max(0, MAX_FILES - items.length)
    const accepted = incoming.slice(0, room)
    const ignored = incoming.length - accepted.length

    const added = accepted.map((file): Item => {
      const validation = validatePngFile(file)
      const base = { id: nextId(), file, outName: getJpgFileName(file.name) }
      return validation.status === 'ok'
        ? { ...base, status: 'pending' }
        : { ...base, status: 'error', error: validation.code }
    })

    setItems((current) => [...current, ...added])
    setNotice(ignored > 0 ? s.tooManyFiles(MAX_FILES, ignored) : null)
    setZipFailed(false)
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
  }

  function handleClear() {
    setItems([])
    setNotice(null)
    setZipFailed(false)
  }

  /** Converts the given images one at a time, with the quality chosen when the batch starts. */
  async function runConversion(batch: Item[]) {
    if (isConverting || batch.length === 0) return
    const batchQuality = quality

    setIsConverting(true)
    setZipFailed(false)

    let position = 0
    for (const entry of batch) {
      if (!aliveRef.current) return

      // The image may have been removed since the batch started.
      if (!itemsRef.current.some((candidate) => candidate.id === entry.id)) continue

      position += 1
      setProgress({ current: position, total: batch.length })
      // Also clears any previous result, so converting again replaces it.
      updateItem(entry.id, {
        status: 'converting',
        error: undefined,
        blob: undefined,
        width: undefined,
        height: undefined,
        quality: undefined,
      })

      // One image at a time keeps peak memory low when several large PNGs are queued.
      const result = await convertPngToJpg(entry.file, toCanvasQuality(batchQuality))
      if (!aliveRef.current) return

      if (result.status === 'ok') {
        updateItem(entry.id, {
          status: 'done',
          blob: result.blob,
          width: result.width,
          height: result.height,
          quality: batchQuality,
        })
      } else {
        updateItem(entry.id, { status: 'error', error: result.code })
      }

      // Let the browser paint between images.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    }

    setIsConverting(false)
    setProgress(null)
  }

  function handleConvert() {
    return runConversion(items.filter((item) => item.status === 'pending'))
  }

  function handleReconvert() {
    return runConversion(items.filter((item) => item.status === 'done' && item.quality !== quality))
  }

  async function handleDownloadAll() {
    const converted = items.flatMap((item) =>
      item.status === 'done' && item.blob ? [{ name: item.outName, blob: item.blob }] : [],
    )
    if (converted.length === 0) return

    setIsZipping(true)
    setZipFailed(false)
    try {
      const entries = await createZipEntries(converted)
      downloadBlob(new Blob(buildZip(entries), { type: 'application/zip' }), ZIP_FILE_NAME)
    } catch {
      if (aliveRef.current) setZipFailed(true)
    } finally {
      if (aliveRef.current) setIsZipping(false)
    }
  }

  const pendingCount = items.filter((item) => item.status === 'pending').length
  const doneCount = items.filter((item) => item.status === 'done').length
  const errorCount = items.filter((item) => item.status === 'error').length
  const mismatchCount = items.filter(
    (item) => item.status === 'done' && item.quality !== undefined && item.quality !== quality,
  ).length

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

      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={qualityId} className="text-sm font-medium text-ink-800">
            {s.qualityLabel}
          </label>
          <output htmlFor={qualityId} className="text-sm font-semibold text-ink-950">
            {s.qualityValue(quality)}
          </output>
        </div>
        <input
          id={qualityId}
          type="range"
          min={MIN_QUALITY}
          max={MAX_QUALITY}
          step={1}
          value={quality}
          disabled={isConverting}
          aria-describedby={qualityHintId}
          aria-valuetext={s.qualityValue(quality)}
          onChange={(event) => setQuality(clampQuality(Number(event.target.value)))}
          className="mt-3 w-full accent-brand-600"
        />
        <p id={qualityHintId} className="mt-2 text-xs text-ink-600">
          {s.qualityHint}
        </p>
      </div>

      <p className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-700">{s.transparencyNote}</p>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleConvert} disabled={pendingCount === 0 || isConverting}>
          {isConverting ? (
            <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <ImageUp className="h-4 w-4" aria-hidden="true" />
          )}
          {isConverting ? s.converting : s.convertButton(pendingCount)}
        </Button>
        {mismatchCount > 0 && (
          <Button type="button" variant="secondary" onClick={handleReconvert} disabled={isConverting}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {s.reconvert(quality)}
          </Button>
        )}
        {doneCount > 1 && (
          <Button type="button" variant="secondary" onClick={handleDownloadAll} disabled={isZipping || isConverting}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {s.downloadAll}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={handleClear} disabled={items.length === 0}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {s.clearSelection}
        </Button>
      </div>

      <div aria-live="polite" className="space-y-1 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">
        {items.length === 0 && <p>{s.emptyState}</p>}
        {isConverting && progress && <p>{s.progress(progress.current, progress.total)}</p>}
        {!isConverting && (doneCount > 0 || errorCount > 0) && <p>{s.summary(doneCount, errorCount)}</p>}
        {!isConverting && pendingCount > 0 && <p>{s.readyToConvert(pendingCount)}</p>}
        {!isConverting && mismatchCount > 0 && <p>{s.qualityMismatch(mismatchCount, quality)}</p>}
        {isZipping && <p>{s.zipping}</p>}
        {notice && <p>{notice}</p>}
        {zipFailed && <p className="font-medium text-red-700">{s.zipFailed}</p>}
      </div>

      {items.length > 0 && (
        <section>
          <p className="mb-3 text-sm font-medium text-ink-800">{s.listTitle(items.length)}</p>
          <ul className="space-y-3">
            {items.map((item) => (
              <ImageRow key={item.id} item={item} onRemove={handleRemove} />
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

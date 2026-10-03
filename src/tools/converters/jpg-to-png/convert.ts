// Pure helpers for the JPG → PNG converter — no React, no DOM, no Canvas. Everything here
// is unit-testable in a plain Node environment. The browser-only conversion lives in
// `convertImage.ts`.

/** Largest accepted JPG file, in bytes (20 MB). */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

/** Most images that can be in the list at once. */
export const MAX_FILES = 50

/** Largest decoded image (width × height) the tool will try to convert. */
export const MAX_PIXELS = 100_000_000

/** MIME types accepted as JPEG ("image/jpg" and "image/pjpeg" are common non-standard aliases). */
export const JPEG_MIME_TYPES: readonly string[] = ['image/jpeg', 'image/jpg', 'image/pjpeg']

export type FileValidationErrorCode = 'notJpeg' | 'empty' | 'tooLarge'

export type FileValidation = { status: 'ok' } | { status: 'error'; code: FileValidationErrorCode }

export interface FileLike {
  name: string
  type: string
  size: number
}

/** True when the file name ends in `.jpg` or `.jpeg` (case-insensitive). */
export function hasJpegExtension(name: string): boolean {
  return /\.jpe?g$/i.test(name.trim())
}

/**
 * Checks that a file can be converted.
 *
 * Accepted: a JPEG MIME type, or an empty MIME type (some systems do not report one) together
 * with a `.jpg`/`.jpeg` extension. A file reporting any other MIME type is rejected even if it
 * is named `.jpg`. Checked in this order: type, empty file, maximum size.
 */
export function validateJpegFile(file: FileLike): FileValidation {
  const type = file.type.trim().toLowerCase()
  const isJpegType = JPEG_MIME_TYPES.includes(type)
  const isUntypedJpegName = type === '' && hasJpegExtension(file.name)

  if (!isJpegType && !isUntypedJpegName) return { status: 'error', code: 'notJpeg' }
  if (file.size <= 0) return { status: 'error', code: 'empty' }
  if (file.size > MAX_FILE_SIZE_BYTES) return { status: 'error', code: 'tooLarge' }
  return { status: 'ok' }
}

export type DimensionsValidation =
  | { status: 'ok' }
  | { status: 'error'; code: 'invalidDimensions' | 'tooManyPixels' }

/** Checks decoded image dimensions: whole, positive, and within {@link MAX_PIXELS}. */
export function validateDimensions(width: number, height: number): DimensionsValidation {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return { status: 'error', code: 'invalidDimensions' }
  }
  if (width * height > MAX_PIXELS) return { status: 'error', code: 'tooManyPixels' }
  return { status: 'ok' }
}

/**
 * Output file name: `.jpg`/`.jpeg` (any case) is replaced by `.png`; other names get `.png`
 * appended (a trailing `.png` is kept as is). An empty base name becomes "imagem".
 */
export function getPngFileName(name: string): string {
  const base = name.trim().replace(/\.(jpe?g|png)$/i, '')
  return `${base === '' ? 'imagem' : base}.png`
}

function splitExtension(name: string): { stem: string; extension: string } {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return { stem: name, extension: '' }
  return { stem: name.slice(0, dot), extension: name.slice(dot) }
}

/**
 * Makes file names unique (case-insensitively, as on Windows/macOS) by adding " (2)", " (3)"…
 * before the extension. Order is preserved and the first occurrence keeps its name.
 */
export function makeUniqueFileNames(names: readonly string[]): string[] {
  const used = new Set<string>()
  return names.map((name) => {
    let candidate = name
    if (used.has(candidate.toLowerCase())) {
      const { stem, extension } = splitExtension(name)
      let counter = 2
      candidate = `${stem} (${counter})${extension}`
      while (used.has(candidate.toLowerCase())) {
        counter += 1
        candidate = `${stem} (${counter})${extension}`
      }
    }
    used.add(candidate.toLowerCase())
    return candidate
  })
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-PT', { maximumFractionDigits: 1 })
}

/** Human-readable size in pt-PT: "512 B", "1,5 KB", "2,3 MB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024)} KB`
  return `${formatNumber(bytes / (1024 * 1024))} MB`
}

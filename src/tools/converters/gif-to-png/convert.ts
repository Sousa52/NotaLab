// Pure helpers specific to the GIF → PNG converter — no React, no DOM, no Canvas. Everything
// here is unit-testable in a plain Node environment. Limits, size formatting, file-name
// uniqueness, dimension checks and the ZIP writer are shared with the JPG → PNG converter
// (`../jpg-to-png`) instead of being copied. GIF content inspection is in `gif.ts`.

import { MAX_FILE_SIZE_BYTES, type FileLike } from '../jpg-to-png/convert'

/** MIME types accepted as GIF. */
export const GIF_MIME_TYPES: readonly string[] = ['image/gif']

export type GifValidationErrorCode = 'notGif' | 'empty' | 'tooLarge'

export type GifValidation = { status: 'ok' } | { status: 'error'; code: GifValidationErrorCode }

/** True when the file name ends in `.gif` (case-insensitive). */
export function hasGifExtension(name: string): boolean {
  return /\.gif$/i.test(name.trim())
}

/**
 * Checks that a file can be converted.
 *
 * Accepted: a GIF MIME type, or an empty MIME type (some systems do not report one) together
 * with a `.gif` extension. A file reporting any other MIME type is rejected even if it is
 * named `.gif`. Checked in this order: type, empty file, maximum size. The file content is
 * checked again before conversion (see `analyzeGif`), so the type alone is never trusted.
 */
export function validateGifFile(file: FileLike): GifValidation {
  const type = file.type.trim().toLowerCase()
  const isGifType = GIF_MIME_TYPES.includes(type)
  const isUntypedGifName = type === '' && hasGifExtension(file.name)

  if (!isGifType && !isUntypedGifName) return { status: 'error', code: 'notGif' }
  if (file.size <= 0) return { status: 'error', code: 'empty' }
  if (file.size > MAX_FILE_SIZE_BYTES) return { status: 'error', code: 'tooLarge' }
  return { status: 'ok' }
}

/**
 * Output file name: `.gif` (any case) is replaced by `.png`; other names get `.png` appended
 * (a trailing `.png` is kept as is). An empty base name becomes "imagem".
 */
export function getPngFileNameFromGif(name: string): string {
  const base = name.trim().replace(/\.(gif|png)$/i, '')
  return `${base === '' ? 'imagem' : base}.png`
}

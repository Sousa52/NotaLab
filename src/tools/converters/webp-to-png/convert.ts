// Pure helpers specific to the WebP → PNG converter — no React, no DOM, no Canvas. Everything
// here is unit-testable in a plain Node environment. Limits, size formatting, file-name
// uniqueness, dimension checks and the ZIP writer are shared with the JPG → PNG converter
// (`../jpg-to-png`) instead of being copied.

import { MAX_FILE_SIZE_BYTES, type FileLike } from '../jpg-to-png/convert'

/** MIME types accepted as WebP. */
export const WEBP_MIME_TYPES: readonly string[] = ['image/webp']

export type WebpValidationErrorCode = 'notWebp' | 'empty' | 'tooLarge'

export type WebpValidation = { status: 'ok' } | { status: 'error'; code: WebpValidationErrorCode }

/** True when the file name ends in `.webp` (case-insensitive). */
export function hasWebpExtension(name: string): boolean {
  return /\.webp$/i.test(name.trim())
}

/**
 * Checks that a file can be converted.
 *
 * Accepted: a WebP MIME type, or an empty MIME type (some systems do not report one) together
 * with a `.webp` extension. A file reporting any other MIME type is rejected even if it is
 * named `.webp`. Checked in this order: type, empty file, maximum size.
 */
export function validateWebpFile(file: FileLike): WebpValidation {
  const type = file.type.trim().toLowerCase()
  const isWebpType = WEBP_MIME_TYPES.includes(type)
  const isUntypedWebpName = type === '' && hasWebpExtension(file.name)

  if (!isWebpType && !isUntypedWebpName) return { status: 'error', code: 'notWebp' }
  if (file.size <= 0) return { status: 'error', code: 'empty' }
  if (file.size > MAX_FILE_SIZE_BYTES) return { status: 'error', code: 'tooLarge' }
  return { status: 'ok' }
}

/**
 * Output file name: `.webp` (any case) is replaced by `.png`; other names get `.png`
 * appended (a trailing `.png` is kept as is). An empty base name becomes "imagem".
 */
export function getPngFileNameFromWebp(name: string): string {
  const base = name.trim().replace(/\.(webp|png)$/i, '')
  return `${base === '' ? 'imagem' : base}.png`
}

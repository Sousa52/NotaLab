// Pure helpers specific to the PNG → JPG converter — no React, no DOM, no Canvas. Everything
// here is unit-testable in a plain Node environment. Limits, size formatting, file-name
// uniqueness, dimension checks and the ZIP writer are shared with the JPG → PNG converter
// (`../jpg-to-png`) instead of being copied.

import { MAX_FILE_SIZE_BYTES, type FileLike } from '../jpg-to-png/convert'

export const DEFAULT_QUALITY = 90
export const MIN_QUALITY = 10
export const MAX_QUALITY = 100

/** MIME types accepted as PNG ("image/x-png" is an old non-standard alias). */
export const PNG_MIME_TYPES: readonly string[] = ['image/png', 'image/x-png']

export type PngValidationErrorCode = 'notPng' | 'empty' | 'tooLarge'

export type PngValidation = { status: 'ok' } | { status: 'error'; code: PngValidationErrorCode }

/** True when the file name ends in `.png` (case-insensitive). */
export function hasPngExtension(name: string): boolean {
  return /\.png$/i.test(name.trim())
}

/**
 * Checks that a file can be converted.
 *
 * Accepted: a PNG MIME type, or an empty MIME type (some systems do not report one) together
 * with a `.png` extension. A file reporting any other MIME type is rejected even if it is
 * named `.png`. Checked in this order: type, empty file, maximum size.
 */
export function validatePngFile(file: FileLike): PngValidation {
  const type = file.type.trim().toLowerCase()
  const isPngType = PNG_MIME_TYPES.includes(type)
  const isUntypedPngName = type === '' && hasPngExtension(file.name)

  if (!isPngType && !isUntypedPngName) return { status: 'error', code: 'notPng' }
  if (file.size <= 0) return { status: 'error', code: 'empty' }
  if (file.size > MAX_FILE_SIZE_BYTES) return { status: 'error', code: 'tooLarge' }
  return { status: 'ok' }
}

/**
 * Output file name: `.png`/`.jpg`/`.jpeg` (any case) is replaced by `.jpg`; other names get
 * `.jpg` appended. An empty base name becomes "imagem".
 */
export function getJpgFileName(name: string): string {
  const base = name.trim().replace(/\.(png|jpe?g)$/i, '')
  return `${base === '' ? 'imagem' : base}.jpg`
}

/** Rounds to a whole percent and keeps it within the allowed range (non-numbers → default). */
export function clampQuality(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_QUALITY
  return Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, Math.round(value)))
}

/** Converts a quality percentage (10–100) to the 0–1 value `canvas.toBlob` expects. */
export function toCanvasQuality(percent: number): number {
  return clampQuality(percent) / 100
}

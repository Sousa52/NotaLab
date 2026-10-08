// Pure helpers for the Images → PDF tool — no React, no DOM, no Canvas, no PDF library. Everything
// here is unit-testable in a plain Node environment. File validation reuses the JPG, PNG and
// WebP validators from the other converters; the 50-file and 20 MB limits are shared with them
// (`MAX_FILES`, `MAX_FILE_SIZE_BYTES` in `../jpg-to-png/convert`). Page layout is in
// `layout.ts` and PDF creation in `pdf.ts`.

import { MAX_FILES, validateJpegFile, type FileLike } from '../jpg-to-png/convert'
import { validatePngFile } from '../png-to-jpg/convert'
import { validateWebpFile } from '../webp-to-png/convert'

/** Name of the downloaded PDF. */
export const PDF_FILE_NAME = 'imagens.pdf'

/**
 * Pages are painted over this colour before being embedded as JPEG, which has no transparency:
 * transparent pixels of a PNG or WebP end up white and semi-transparent ones blend with white.
 */
export const BACKGROUND_COLOR = '#ffffff'

/** JPEG quality (0–1) used when images are prepared for the PDF. */
export const JPEG_QUALITY = 0.92

/**
 * Longest side, in pixels, of an image embedded in the PDF. Larger images are scaled down
 * (keeping their aspect ratio) to bound memory use and PDF size; 3508 px is the long side of an
 * A4 page at 300 dpi, which is all the page can show at print quality.
 */
export const MAX_EMBED_DIMENSION = 3508

export type ImageFormat = 'jpeg' | 'png' | 'webp'

export type ImageValidationErrorCode = 'unsupported' | 'empty' | 'tooLarge'

export type ImageValidation = { status: 'ok' } | { status: 'error'; code: ImageValidationErrorCode }

/**
 * Checks that a file looks like a JPG, PNG or WebP image, using the existing validators for
 * each format (MIME type, or an empty type with the right extension; non-empty; at most 20 MB).
 * A file with a recognised type but a bad size reports that problem; any other file is
 * `unsupported`. The real content is checked later (see `detectImageFormat`).
 */
export function validateImageFile(file: FileLike): ImageValidation {
  const results = [validateJpegFile(file), validatePngFile(file), validateWebpFile(file)]

  if (results.some((result) => result.status === 'ok')) return { status: 'ok' }

  for (const result of results) {
    if (
      result.status === 'error' &&
      result.code !== 'notJpeg' &&
      result.code !== 'notPng' &&
      result.code !== 'notWebp'
    ) {
      return { status: 'error', code: result.code }
    }
  }
  return { status: 'error', code: 'unsupported' }
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((value, index) => bytes[offset + index] === value)
}

/**
 * Identifies JPEG, PNG and WebP from the first bytes of a file (its "magic numbers"),
 * whatever the file is called or its MIME type says. Returns `null` for anything else.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png'
  // WebP: "RIFF" + 4 size bytes + "WEBP".
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp'
  return null
}

/**
 * The pixel size an image is embedded at: unchanged when its longest side is within
 * {@link MAX_EMBED_DIMENSION}, otherwise scaled down to that, keeping the aspect ratio (each
 * side at least 1 px). `null` for sizes that are not positive whole numbers.
 */
export function calculateEmbedSize(width: number, height: number): { width: number; height: number } | null {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null

  const longest = Math.max(width, height)
  if (longest <= MAX_EMBED_DIMENSION) return { width, height }

  const scale = MAX_EMBED_DIMENSION / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * A copy of the list with the item at `from` moved to `to` (the page order of the PDF follows
 * the list order). Out-of-range or non-integer indexes return an unchanged copy.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const copy = [...items]
  const valid = (index: number) => Number.isInteger(index) && index >= 0 && index < copy.length
  if (!valid(from) || !valid(to) || from === to) return copy

  const [moved] = copy.splice(from, 1)
  if (moved === undefined) return [...items]
  copy.splice(to, 0, moved)
  return copy
}

/**
 * Splits newly chosen files into those that still fit in the list and those left out because it
 * is full. The limit ({@link MAX_FILES}) counts the images already in the list, and files are
 * taken in the order they were chosen.
 */
export function takeAvailableSlots<T>(
  incoming: readonly T[],
  currentCount: number,
  maxFiles: number = MAX_FILES,
): { accepted: T[]; ignored: number } {
  const room = Math.max(0, maxFiles - Math.max(0, currentCount))
  const accepted = incoming.slice(0, room)
  return { accepted, ignored: incoming.length - accepted.length }
}

// Pure helpers specific to the JPG → WebP converter — no React, no DOM, no Canvas. Everything
// here is unit-testable in a plain Node environment. File validation (`validateJpegFile`),
// limits, size formatting, file-name uniqueness, dimension checks and the ZIP writer are
// shared with the JPG → PNG converter (`../jpg-to-png`), and the quality range with the
// PNG → JPG converter, instead of being copied.

import { MAX_QUALITY, MIN_QUALITY } from '../png-to-jpg/convert'

export { MAX_QUALITY, MIN_QUALITY }

/** WebP is lossy-compressed like JPG; 85% keeps photos sharp at a clearly smaller size. */
export const DEFAULT_QUALITY = 85

export const WEBP_MIME_TYPE = 'image/webp'

/**
 * Output file name: `.jpg`/`.jpeg` (any case) is replaced by `.webp`; other names get `.webp`
 * appended. An empty base name becomes "imagem".
 *
 * A trailing `.png` or `.webp` is replaced too: a file whose MIME type says JPEG is accepted
 * even when it is named differently, and it should not end up as "photo.png.webp".
 */
export function getWebpFileName(name: string): string {
  const base = name.trim().replace(/\.(jpe?g|png|webp)$/i, '')
  return `${base === '' ? 'imagem' : base}.webp`
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

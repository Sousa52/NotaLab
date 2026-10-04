// Pure helpers for the SVG → PNG converter — no React, no DOM, no Canvas. Everything here is
// unit-testable in a plain Node environment. File limits, size formatting and the ZIP writer
// are shared with the other converters (`../jpg-to-png`, `../png-to-jpg`); the SVG text
// parsing lives in `svg.ts`.

import { MAX_FILE_SIZE_BYTES, type FileLike } from '../jpg-to-png/convert'

/** Largest PNG side, in pixels (stays within what common browsers can allocate for a canvas). */
export const MAX_OUTPUT_DIMENSION = 16384

/** Largest PNG area, in pixels (50 megapixels ≈ 200 MB of canvas memory). */
export const MAX_OUTPUT_PIXELS = 50_000_000

/** The registered MIME type for SVG. */
export const SVG_MIME_TYPES: readonly string[] = ['image/svg+xml']

/**
 * MIME types some browsers or operating systems report for a `.svg` file. They are only
 * accepted together with a `.svg` extension; the content is checked again before conversion.
 */
const GENERIC_MIME_TYPES: readonly string[] = [
  '',
  'text/xml',
  'application/xml',
  'text/plain',
  'application/octet-stream',
]

export type SvgValidationErrorCode = 'notSvg' | 'empty' | 'tooLarge'

export type SvgValidation = { status: 'ok' } | { status: 'error'; code: SvgValidationErrorCode }

/** True when the file name ends in `.svg` (case-insensitive). */
export function hasSvgExtension(name: string): boolean {
  return /\.svg$/i.test(name.trim())
}

/**
 * Checks that a file can be converted, without trusting the MIME type alone.
 *
 * Accepted: the SVG MIME type, or a `.svg` file name together with an empty or generic
 * text/binary MIME type. A file reporting any other type (for example `text/html` or
 * `image/png`) is rejected even if it is named `.svg`. Checked in this order: type, empty
 * file, maximum size. The file content is validated later (see `prepareSvg`).
 */
export function validateSvgFile(file: FileLike): SvgValidation {
  const type = file.type.trim().toLowerCase()
  const isSvgType = SVG_MIME_TYPES.includes(type)
  const isGenericSvgName = GENERIC_MIME_TYPES.includes(type) && hasSvgExtension(file.name)

  if (!isSvgType && !isGenericSvgName) return { status: 'error', code: 'notSvg' }
  if (file.size <= 0) return { status: 'error', code: 'empty' }
  if (file.size > MAX_FILE_SIZE_BYTES) return { status: 'error', code: 'tooLarge' }
  return { status: 'ok' }
}

/**
 * Output file name: `.svg` (any case) is replaced by `.png`; other names get `.png` appended
 * (a trailing `.png` is kept as is). An empty base name becomes "imagem".
 */
export function getPngFileNameFromSvg(name: string): string {
  const base = name.trim().replace(/\.(svg|png)$/i, '')
  return `${base === '' ? 'imagem' : base}.png`
}

/** How big the PNG should be: a multiple of the SVG's own size, or a fixed width in pixels. */
export type OutputSetting = { kind: 'scale'; value: number } | { kind: 'width'; value: number }

export interface OutputOption {
  id: string
  setting: OutputSetting
}

export const OUTPUT_OPTIONS: readonly OutputOption[] = [
  { id: 'scale-1', setting: { kind: 'scale', value: 1 } },
  { id: 'scale-2', setting: { kind: 'scale', value: 2 } },
  { id: 'scale-3', setting: { kind: 'scale', value: 3 } },
  { id: 'scale-4', setting: { kind: 'scale', value: 4 } },
  { id: 'width-256', setting: { kind: 'width', value: 256 } },
  { id: 'width-512', setting: { kind: 'width', value: 512 } },
  { id: 'width-1024', setting: { kind: 'width', value: 1024 } },
  { id: 'width-2048', setting: { kind: 'width', value: 2048 } },
  { id: 'width-4096', setting: { kind: 'width', value: 4096 } },
]

/** 2× the SVG's size: sharper than 1× for the small SVGs (icons, logos) that are common. */
export const DEFAULT_OUTPUT_ID = 'scale-2'

const DEFAULT_SETTING: OutputSetting = { kind: 'scale', value: 2 }

/** Looks up an option by id; unknown ids fall back to the default. */
export function getOutputSetting(id: string): OutputSetting {
  return OUTPUT_OPTIONS.find((option) => option.id === id)?.setting ?? DEFAULT_SETTING
}

export type OutputSizeResult =
  | { status: 'ok'; width: number; height: number }
  | { status: 'error'; code: 'invalidSize' | 'outputTooLarge' }

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/**
 * Works out the PNG size in whole pixels, always keeping the SVG's aspect ratio (each side is
 * at least 1 px). Rejects sizes above {@link MAX_OUTPUT_DIMENSION} per side or
 * {@link MAX_OUTPUT_PIXELS} in total, so a large scale can never exhaust canvas memory.
 */
export function calculateOutputSize(
  natural: { width: number; height: number },
  setting: OutputSetting,
): OutputSizeResult {
  if (!isPositiveFinite(natural.width) || !isPositiveFinite(natural.height) || !isPositiveFinite(setting.value)) {
    return { status: 'error', code: 'invalidSize' }
  }

  const rawWidth = setting.kind === 'scale' ? natural.width * setting.value : setting.value
  const rawHeight =
    setting.kind === 'scale' ? natural.height * setting.value : (natural.height * setting.value) / natural.width

  const width = Math.max(1, Math.round(rawWidth))
  const height = Math.max(1, Math.round(rawHeight))

  if (width > MAX_OUTPUT_DIMENSION || height > MAX_OUTPUT_DIMENSION || width * height > MAX_OUTPUT_PIXELS) {
    return { status: 'error', code: 'outputTooLarge' }
  }
  return { status: 'ok', width, height }
}

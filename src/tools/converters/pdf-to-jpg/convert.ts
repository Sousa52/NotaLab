// Pure helpers for the PDF → JPG converter — no React, no DOM, no Canvas and no PDF.js, so
// everything here is unit-testable in a plain Node environment. Rendering lives in
// `render.ts`, page-by-page processing and packaging in `process.ts`. The size limit, the
// `FileLike` type and size formatting are shared with the other converters instead of being
// copied.

import { MAX_FILE_SIZE_BYTES, type FileLike } from '../jpg-to-png/convert'

/** Most pages converted from one PDF (the same number the other converters accept as files). */
export const MAX_PDF_PAGES = 50

/** JPEG quality for every page. Fixed: text and line art stay sharp without huge files. */
export const JPEG_QUALITY = 0.92

/** Pages are painted over this colour, because JPG has no transparency. */
export const BACKGROUND_COLOR = '#ffffff'

/** A PDF page is measured in points; 72 points make one inch. */
export const PDF_POINTS_PER_INCH = 72

/**
 * Largest canvas, in pixels, that a single page is rendered to. Kept below the 16 777 216
 * pixel limit of Safari on iOS, so a page never silently renders blank on phones.
 */
export const MAX_RENDER_PIXELS = 16_000_000

/** Longest side, in pixels, of a rendered page. */
export const MAX_RENDER_SIDE = 8192

/** MIME types accepted as PDF ("application/x-pdf" is an old non-standard alias). */
export const PDF_MIME_TYPES: readonly string[] = ['application/pdf', 'application/x-pdf']

export type ResolutionId = 'low' | 'normal' | 'high'

export interface ResolutionOption {
  id: ResolutionId
  /** Dots per inch the pages are rendered at. */
  dpi: number
}

const NORMAL_RESOLUTION: ResolutionOption = { id: 'normal', dpi: 150 }

/** The resolutions offered to the user. 150 DPI is sharp on screen and keeps files small. */
export const RESOLUTION_OPTIONS: readonly ResolutionOption[] = [
  { id: 'low', dpi: 100 },
  NORMAL_RESOLUTION,
  { id: 'high', dpi: 200 },
]

export const DEFAULT_RESOLUTION_ID: ResolutionId = NORMAL_RESOLUTION.id

/** Finds a resolution by id; an unknown id gives the default one. */
export function getResolution(id: string): ResolutionOption {
  return RESOLUTION_OPTIONS.find((option) => option.id === id) ?? NORMAL_RESOLUTION
}

/** Problems found by looking only at the file's name, type and size. */
export type PdfValidationErrorCode = 'notPdf' | 'empty' | 'tooLarge'

/** Problems found while opening the PDF. */
export type OpenErrorCode =
  | 'invalidPdf'
  | 'encrypted'
  | 'noPages'
  | 'tooManyPages'
  | 'loadFailed'
  | 'libraryFailed'

/** Problems found while turning one page into a JPG. */
export type RenderErrorCode = 'renderFailed' | 'conversionFailed'

export type PdfValidation = { status: 'ok' } | { status: 'error'; code: PdfValidationErrorCode }

/** True when the file name ends in `.pdf` (case-insensitive). */
export function hasPdfExtension(name: string): boolean {
  return /\.pdf$/i.test(name.trim())
}

/**
 * Checks that a file can be converted.
 *
 * Accepted: a PDF MIME type, or an empty MIME type (some systems do not report one) together
 * with a `.pdf` extension. A file reporting any other MIME type is rejected even if it is
 * named `.pdf`. Checked in this order: type, empty file, maximum size.
 */
export function validatePdfFile(file: FileLike): PdfValidation {
  const type = file.type.trim().toLowerCase()
  const isPdfType = PDF_MIME_TYPES.includes(type)
  const isUntypedPdfName = type === '' && hasPdfExtension(file.name)

  if (!isPdfType && !isUntypedPdfName) return { status: 'error', code: 'notPdf' }
  if (file.size <= 0) return { status: 'error', code: 'empty' }
  if (file.size > MAX_FILE_SIZE_BYTES) return { status: 'error', code: 'tooLarge' }
  return { status: 'ok' }
}

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"

/** How many bytes from the start of a file are searched for the PDF signature. */
export const PDF_HEADER_BYTES = 1024

/**
 * True when "%PDF-" appears in the first 1024 bytes, where the PDF format requires it (a few
 * bytes of junk before it are tolerated by readers). Catches renamed files without having to
 * load the PDF library.
 */
export function hasPdfHeader(bytes: Uint8Array): boolean {
  const last = Math.min(bytes.length, PDF_HEADER_BYTES) - PDF_SIGNATURE.length
  for (let start = 0; start <= last; start += 1) {
    if (PDF_SIGNATURE.every((byte, offset) => bytes[start + offset] === byte)) return true
  }
  return false
}

export type PageCountValidation =
  | { status: 'ok' }
  | { status: 'error'; code: 'noPages' | 'tooManyPages' }

/** Checks the number of pages: at least one, at most {@link MAX_PDF_PAGES}. */
export function validatePageCount(pageCount: number): PageCountValidation {
  if (!Number.isInteger(pageCount) || pageCount < 1) return { status: 'error', code: 'noPages' }
  if (pageCount > MAX_PDF_PAGES) return { status: 'error', code: 'tooManyPages' }
  return { status: 'ok' }
}

const MAX_BASE_NAME_LENGTH = 100
const FALLBACK_BASE_NAME = 'documento'
const FORBIDDEN_NAME_CHARACTERS = '\\/:*?"<>|'

function isForbiddenNameCharacter(character: string): boolean {
  return character.charCodeAt(0) < 32 || FORBIDDEN_NAME_CHARACTERS.includes(character)
}

/**
 * Name of the PDF without `.pdf`, made safe to use inside a file name: characters that
 * Windows does not allow (and control characters) become "-", spaces are tidied, leading and
 * trailing dots are removed and very long names are cut. An empty result becomes "documento".
 */
export function getPdfBaseName(name: string): string {
  const withoutExtension = name.trim().replace(/\.pdf$/i, '')
  const cleaned = Array.from(withoutExtension, (character) => (isForbiddenNameCharacter(character) ? '-' : character))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
  const shortened = Array.from(cleaned).slice(0, MAX_BASE_NAME_LENGTH).join('').replace(/[. ]+$/, '').trim()
  return shortened === '' ? FALLBACK_BASE_NAME : shortened
}

/** File name of one page: "documento-pagina-1.jpg" (page numbers start at 1, without padding). */
export function getPageFileName(pdfName: string, pageNumber: number): string {
  return `${getPdfBaseName(pdfName)}-pagina-${pageNumber}.jpg`
}

/** File name of the archive holding all pages: "documento-jpg.zip". */
export function getZipFileName(pdfName: string): string {
  return `${getPdfBaseName(pdfName)}-jpg.zip`
}

export interface RenderSize {
  /** Scale to give PDF.js (1 = 72 DPI). */
  scale: number
  /** Canvas size in whole pixels. */
  width: number
  height: number
  /** True when the page was rendered smaller than the chosen resolution asks for. */
  reduced: boolean
}

/**
 * Works out how a page is rendered. `pageWidth` and `pageHeight` are the page size in points
 * (scale 1, rotation applied). The chosen resolution is used unless the page would exceed
 * {@link MAX_RENDER_PIXELS} or {@link MAX_RENDER_SIDE} (posters, plans), in which case the
 * scale is lowered so the aspect ratio is kept and the browser does not run out of memory.
 * Returns null for a page without a usable size.
 */
export function calculateRenderScale(pageWidth: number, pageHeight: number, dpi: number): RenderSize | null {
  const valid = [pageWidth, pageHeight, dpi].every((value) => Number.isFinite(value) && value > 0)
  if (!valid) return null

  const requested = dpi / PDF_POINTS_PER_INCH
  const byPixels = Math.sqrt(MAX_RENDER_PIXELS / (pageWidth * pageHeight))
  const bySide = MAX_RENDER_SIDE / Math.max(pageWidth, pageHeight)
  const scale = Math.min(requested, byPixels, bySide)

  return {
    scale,
    width: Math.max(1, Math.floor(pageWidth * scale)),
    height: Math.max(1, Math.floor(pageHeight * scale)),
    reduced: scale < requested,
  }
}

function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('name' in error)) return ''
  return typeof error.name === 'string' ? error.name : ''
}

/**
 * Turns an error thrown while opening a PDF into one of our codes. PDF.js errors are told
 * apart by name (they keep it when they cross from the worker): a password prompt means the
 * file is encrypted, structure problems mean it is not a usable PDF, and anything else is a
 * generic failure.
 */
export function classifyOpenError(error: unknown): OpenErrorCode {
  switch (errorName(error)) {
    case 'PasswordException':
      return 'encrypted'
    case 'InvalidPDFException':
    case 'FormatError':
    case 'MissingPDFException':
      return 'invalidPdf'
    default:
      return 'loadFailed'
  }
}

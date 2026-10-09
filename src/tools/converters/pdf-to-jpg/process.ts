// Page-by-page processing and packaging for the PDF → JPG converter. Neither depends on
// PDF.js or the DOM: the pages come from a `PageRenderer` (see `render.ts` for the real one),
// so the behaviour here is unit-tested with a fake. Uses the ZIP writer and the unique-name
// helper shared with the other converters.

import { buildZip } from '../jpg-to-png/zip'
import { createZipEntries } from '../png-to-jpg/zipEntries'
import { getPageFileName, getZipFileName, type RenderErrorCode } from './convert'

export interface PageImage {
  /** Page number in the PDF, starting at 1. */
  pageNumber: number
  fileName: string
  blob: Blob
  width: number
  height: number
}

export type RenderPageResult =
  | { status: 'ok'; blob: Blob; width: number; height: number }
  | { status: 'error'; code: RenderErrorCode }

/** Something that can turn the pages of one PDF into JPG images, one page at a time. */
export interface PageRenderer {
  readonly pageCount: number
  renderPage(pageNumber: number, dpi: number): Promise<RenderPageResult>
}

export interface ConvertPagesOptions {
  /** Name of the PDF file, used to name the images. */
  pdfName: string
  dpi: number
  /** Checked before every page and after the last one; true stops the conversion. */
  isCancelled?: () => boolean
  /** Called before each page is rendered, with the page number and the total. */
  onProgress?: (current: number, total: number) => void
  /** Called between pages, so the browser can paint and stay responsive. */
  pause?: () => Promise<void>
}

export type ConvertPagesResult =
  | { status: 'ok'; pages: PageImage[] }
  | { status: 'cancelled' }
  | { status: 'error'; code: RenderErrorCode; pageNumber: number }

/**
 * Renders every page in order, one at a time, so only one page canvas exists at once.
 *
 * Stops at the first page that fails and reports which one: a partial result could be taken
 * for the whole document, so nothing from a failed run is returned. Never throws, even if the
 * renderer does.
 */
export async function convertPages(renderer: PageRenderer, options: ConvertPagesOptions): Promise<ConvertPagesResult> {
  const { pdfName, dpi, isCancelled, onProgress, pause } = options
  const total = renderer.pageCount
  const pages: PageImage[] = []

  for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
    if (isCancelled?.()) return { status: 'cancelled' }
    onProgress?.(pageNumber, total)

    let result: RenderPageResult
    try {
      result = await renderer.renderPage(pageNumber, dpi)
    } catch {
      return { status: 'error', code: 'renderFailed', pageNumber }
    }

    if (isCancelled?.()) return { status: 'cancelled' }
    if (result.status === 'error') return { status: 'error', code: result.code, pageNumber }

    pages.push({
      pageNumber,
      fileName: getPageFileName(pdfName, pageNumber),
      blob: result.blob,
      width: result.width,
      height: result.height,
    })

    if (pause) await pause()
  }

  return { status: 'ok', pages }
}

export type DownloadPackage = { kind: 'jpg' | 'zip'; blob: Blob; fileName: string }

/**
 * Prepares what the user downloads: the JPG itself for a one-page PDF, otherwise a ZIP with
 * one JPG per page, in page order. The images are stored without extra compression (JPG is
 * already compressed).
 *
 * @throws RangeError when there are no pages, or when the ZIP limits would be exceeded.
 */
export async function packagePages(pages: readonly PageImage[], pdfName: string): Promise<DownloadPackage> {
  const [first] = pages
  if (!first) throw new RangeError('There are no pages to download.')
  if (pages.length === 1) return { kind: 'jpg', blob: first.blob, fileName: first.fileName }

  const entries = await createZipEntries(pages.map((page) => ({ name: page.fileName, blob: page.blob })))
  return {
    kind: 'zip',
    blob: new Blob(buildZip(entries), { type: 'application/zip' }),
    fileName: getZipFileName(pdfName),
  }
}

// Browser-only rendering: opens a PDF with PDF.js and turns each page into a JPG on a canvas.
// Nothing is uploaded anywhere. Pure helpers live in `convert.ts` and the page loop in
// `process.ts` (both unit-tested); this file is the thin layer over PDF.js and the canvas.
//
// PDF.js is large, so it is loaded with a dynamic import the first time a PDF is opened and
// stays out of the main bundle. Its worker and WebAssembly decoders are bundled by Vite
// through `?url` imports, so they work under the `/NotaLab/` base path and in `npm run dev`.

import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import {
  BACKGROUND_COLOR,
  JPEG_QUALITY,
  calculateRenderScale,
  classifyOpenError,
  hasPdfHeader,
  validatePageCount,
  type OpenErrorCode,
  type RenderErrorCode,
} from './convert'
import type { PageRenderer, RenderPageResult } from './process'

interface PdfjsRuntime {
  pdfjs: typeof import('pdfjs-dist')
  /** Folder (with a trailing slash) holding the JPEG 2000, JBIG2 and colour-profile decoders. */
  wasmUrl: string
}

let runtimePromise: Promise<PdfjsRuntime> | undefined

function folderOf(url: string): string {
  return url.slice(0, url.lastIndexOf('/') + 1)
}

/** Loads PDF.js once and points it at its worker and decoders. A failed load can be retried. */
function loadRuntime(): Promise<PdfjsRuntime> {
  runtimePromise ??= (async () => {
    // PDF.js looks for its decoders by file name inside one folder. The JBIG2 and colour
    // decoders are imported only so the bundler copies them next to `openjpeg.wasm`
    // (see the asset file names in vite.config.ts). Without them, scanned pages that use
    // those image formats would come out blank.
    const [pdfjs, worker, openjpeg] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      import('pdfjs-dist/wasm/openjpeg.wasm?url'),
      import('pdfjs-dist/wasm/jbig2.wasm?url'),
      import('pdfjs-dist/wasm/qcms_bg.wasm?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return { pdfjs, wasmUrl: folderOf(openjpeg.default) }
  })().catch((error: unknown) => {
    runtimePromise = undefined
    throw error
  })
  return runtimePromise
}

/** An open PDF. Call `destroy` when done to free the document and its worker memory. */
export interface OpenPdf extends PageRenderer {
  destroy(): Promise<void>
}

export type OpenPdfResult = { status: 'ok'; pdf: OpenPdf } | { status: 'error'; code: OpenErrorCode }

function openFailure(code: OpenErrorCode): OpenPdfResult {
  return { status: 'error', code }
}

function renderFailure(code: RenderErrorCode): RenderPageResult {
  return { status: 'error', code }
}

async function destroyQuietly(task: PDFDocumentLoadingTask): Promise<void> {
  try {
    await task.destroy()
  } catch {
    // Nothing useful to do: the document is being thrown away anyway.
  }
}

/**
 * Opens a PDF and checks that it can be converted: it must look like a PDF, not be
 * password-protected, and have between 1 and {@link MAX_PDF_PAGES} pages.
 *
 * Never throws: problems come back as an error result. Encrypted files are reported as such
 * because passwords are not supported.
 */
export async function openPdf(file: Blob): Promise<OpenPdfResult> {
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    return openFailure('loadFailed')
  }
  if (!hasPdfHeader(bytes)) return openFailure('invalidPdf')

  let runtime: PdfjsRuntime
  try {
    runtime = await loadRuntime()
  } catch {
    return openFailure('libraryFailed')
  }

  // The bytes are handed over to the worker and are not used here again.
  const task = runtime.pdfjs.getDocument({ data: bytes, verbosity: 0, wasmUrl: runtime.wasmUrl })

  let pdf: PDFDocumentProxy
  try {
    pdf = await task.promise
  } catch (error) {
    await destroyQuietly(task)
    return openFailure(classifyOpenError(error))
  }

  const pageCount = validatePageCount(pdf.numPages)
  if (pageCount.status === 'error') {
    await destroyQuietly(task)
    return openFailure(pageCount.code)
  }

  return {
    status: 'ok',
    pdf: {
      pageCount: pdf.numPages,
      renderPage: (pageNumber, dpi) => renderPage(pdf, pageNumber, dpi),
      destroy: () => destroyQuietly(task),
    },
  }
}

/**
 * Renders one page to JPEG. The canvas is filled with white first, so transparent areas of
 * the page end up white (JPG has no transparency). Pages too large for the browser are
 * rendered at a lower scale (see `calculateRenderScale`). Never throws.
 */
async function renderPage(pdf: PDFDocumentProxy, pageNumber: number, dpi: number): Promise<RenderPageResult> {
  let page: PDFPageProxy | undefined
  try {
    page = await pdf.getPage(pageNumber)

    const natural = page.getViewport({ scale: 1 })
    const size = calculateRenderScale(natural.width, natural.height, dpi)
    if (!size) return renderFailure('renderFailed')

    const canvas = document.createElement('canvas')
    try {
      canvas.width = size.width
      canvas.height = size.height
      const context = canvas.getContext('2d')
      if (!context) return renderFailure('conversionFailed')

      context.fillStyle = BACKGROUND_COLOR
      context.fillRect(0, 0, size.width, size.height)

      try {
        const viewport = page.getViewport({ scale: size.scale })
        await page.render({ canvas, viewport, background: BACKGROUND_COLOR }).promise
      } catch {
        return renderFailure('renderFailed')
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
      // A browser that cannot encode JPEG falls back to PNG; treat that as a failure.
      if (!blob || blob.size === 0 || blob.type !== 'image/jpeg') return renderFailure('conversionFailed')
      return { status: 'ok', blob, width: size.width, height: size.height }
    } finally {
      // Free the canvas backing store right away instead of waiting for garbage collection.
      canvas.width = 0
      canvas.height = 0
    }
  } catch {
    return renderFailure('renderFailed')
  } finally {
    page?.cleanup()
  }
}

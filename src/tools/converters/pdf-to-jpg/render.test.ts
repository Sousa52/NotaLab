import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_PDF_PAGES } from './convert'
import { openPdf } from './render'

// `render.ts` needs a real browser (PDF.js, a worker and Canvas). Here PDF.js, the worker URLs
// and the canvas are replaced with small fakes, so these tests check what our code decides:
// what it refuses, how it sizes and paints each page, how errors are mapped and what is
// cleaned up. They do not check how PDF.js or a browser actually draws a page.

const pdfjsMock = vi.hoisted(() => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}))

vi.mock('pdfjs-dist', () => pdfjsMock)
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker.min-abc123.mjs' }))
vi.mock('pdfjs-dist/wasm/openjpeg.wasm?url', () => ({ default: '/assets/pdfjs/openjpeg.wasm' }))
vi.mock('pdfjs-dist/wasm/jbig2.wasm?url', () => ({ default: '/assets/pdfjs/jbig2.wasm' }))
vi.mock('pdfjs-dist/wasm/qcms_bg.wasm?url', () => ({ default: '/assets/pdfjs/qcms_bg.wasm' }))

const A4 = { width: 595.28, height: 841.89 }

function pdfBlob(): Blob {
  return new Blob(['%PDF-1.7\n%fake pdf body\n'], { type: 'application/pdf' })
}

interface FakePageOptions {
  width?: number
  height?: number
  renderError?: boolean
  log?: string[]
}

function fakePage({ width = A4.width, height = A4.height, renderError = false, log = [] }: FakePageOptions = {}) {
  return {
    getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: width * scale, height: height * scale, scale })),
    render: vi.fn((_parameters: unknown) => {
      log.push('page.render')
      return { promise: renderError ? Promise.reject(new Error('render failed')) : Promise.resolve() }
    }),
    cleanup: vi.fn(),
  }
}

type FakePage = ReturnType<typeof fakePage>

/** Makes `getDocument` return a loading task whose document has the given pages. */
function stubDocument(pages: FakePage[], numPages = pages.length) {
  const document = {
    numPages,
    getPage: vi.fn((pageNumber: number) => {
      const page = pages[pageNumber - 1]
      return page ? Promise.resolve(page) : Promise.reject(new Error('no such page'))
    }),
  }
  const task = { promise: Promise.resolve(document), destroy: vi.fn(() => Promise.resolve()) }
  pdfjsMock.getDocument.mockReturnValue(task)
  return { document, task }
}

/** Makes `getDocument` return a loading task that fails to open the file. */
function stubOpenFailure(error: unknown) {
  const task = { promise: Promise.reject(error), destroy: vi.fn(() => Promise.resolve()) }
  task.promise.catch(() => undefined) // the code under test handles it; avoid an unhandled-rejection warning
  pdfjsMock.getDocument.mockReturnValue(task)
  return { task }
}

interface CanvasOptions {
  output?: Blob | null
  hasContext?: boolean
  log?: string[]
}

function stubCanvas({
  output = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
  hasContext = true,
  log = [],
}: CanvasOptions = {}) {
  const context = {
    set fillStyle(value: string) {
      log.push(`fillStyle ${value}`)
    },
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      log.push(`fillRect ${x},${y},${width},${height}`)
    }),
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (hasContext ? context : null)),
    toBlob: vi.fn((callback: (blob: Blob | null) => void, type?: string, quality?: number) => {
      log.push(`toBlob ${type} ${quality}`)
      callback(output)
    }),
  }
  const createElement = vi.fn(() => canvas)
  vi.stubGlobal('document', { createElement })
  return { canvas, createElement, log }
}

/** Opens the fake document and returns the PDF, failing the test if it does not open. */
async function open() {
  const result = await openPdf(pdfBlob())
  if (result.status !== 'ok') throw new Error(`Expected the PDF to open, got ${result.code}`)
  return result.pdf
}

afterEach(() => {
  vi.unstubAllGlobals()
  pdfjsMock.getDocument.mockReset()
})

describe('openPdf: opening', () => {
  it('opens a PDF and reports its page count', async () => {
    const { document } = stubDocument([fakePage(), fakePage(), fakePage()])
    const result = await openPdf(pdfBlob())
    expect(result.status).toBe('ok')
    expect(result.status === 'ok' && result.pdf.pageCount).toBe(document.numPages)
  })

  it('points PDF.js at the bundled worker and decoders, and reads the file bytes', async () => {
    stubDocument([fakePage()])
    await openPdf(pdfBlob())

    expect(pdfjsMock.GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.min-abc123.mjs')
    expect(pdfjsMock.getDocument).toHaveBeenCalledTimes(1)
    const options = pdfjsMock.getDocument.mock.calls[0]?.[0] as { data: Uint8Array; wasmUrl: string; verbosity: number }
    expect(options.wasmUrl).toBe('/assets/pdfjs/')
    expect(options.verbosity).toBe(0)
    expect(new TextDecoder().decode(options.data)).toBe('%PDF-1.7\n%fake pdf body\n')
  })

  it('frees the document when destroyed', async () => {
    const { task } = stubDocument([fakePage()])
    const pdf = await open()
    await pdf.destroy()
    expect(task.destroy).toHaveBeenCalledTimes(1)
  })

  it('does not fail when freeing the document fails', async () => {
    const { task } = stubDocument([fakePage()])
    task.destroy.mockRejectedValue(new Error('already gone'))
    const pdf = await open()
    await expect(pdf.destroy()).resolves.toBeUndefined()
  })

  it.each([
    ['an empty file', new Blob([])],
    ['plain text', new Blob(['hello, I am not a PDF'])],
    ['a PNG', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])])],
  ])('refuses %s without loading PDF.js', async (_label, blob) => {
    await expect(openPdf(blob)).resolves.toEqual({ status: 'error', code: 'invalidPdf' })
    expect(pdfjsMock.getDocument).not.toHaveBeenCalled()
  })

  it('reports loadFailed when the file cannot be read', async () => {
    const unreadable = { arrayBuffer: () => Promise.reject(new Error('read failed')) } as unknown as Blob
    await expect(openPdf(unreadable)).resolves.toEqual({ status: 'error', code: 'loadFailed' })
  })
})

describe('openPdf: unusable documents', () => {
  it('reports a password-protected PDF as encrypted and frees it', async () => {
    const { task } = stubOpenFailure(Object.assign(new Error('No password given'), { name: 'PasswordException' }))
    await expect(openPdf(pdfBlob())).resolves.toEqual({ status: 'error', code: 'encrypted' })
    expect(task.destroy).toHaveBeenCalledTimes(1)
  })

  it('reports a damaged PDF as invalid', async () => {
    stubOpenFailure(Object.assign(new Error('Invalid PDF structure.'), { name: 'InvalidPDFException' }))
    await expect(openPdf(pdfBlob())).resolves.toEqual({ status: 'error', code: 'invalidPdf' })
  })

  it('reports any other opening problem as a generic failure', async () => {
    const { task } = stubOpenFailure(new Error('something else'))
    await expect(openPdf(pdfBlob())).resolves.toEqual({ status: 'error', code: 'loadFailed' })
    expect(task.destroy).toHaveBeenCalledTimes(1)
  })

  it('refuses a PDF without pages and frees it', async () => {
    const { task } = stubDocument([], 0)
    await expect(openPdf(pdfBlob())).resolves.toEqual({ status: 'error', code: 'noPages' })
    expect(task.destroy).toHaveBeenCalledTimes(1)
  })

  it('accepts exactly the maximum number of pages', async () => {
    stubDocument([], MAX_PDF_PAGES)
    const result = await openPdf(pdfBlob())
    expect(result.status).toBe('ok')
  })

  it('refuses a PDF with more than the maximum number of pages and frees it', async () => {
    const { task } = stubDocument([], MAX_PDF_PAGES + 1)
    await expect(openPdf(pdfBlob())).resolves.toEqual({ status: 'error', code: 'tooManyPages' })
    expect(task.destroy).toHaveBeenCalledTimes(1)
  })

  it('reports libraryFailed when PDF.js cannot be loaded', async () => {
    vi.resetModules()
    vi.doMock('pdfjs-dist', () => {
      throw new Error('chunk load failed')
    })
    try {
      const { openPdf: openWithBrokenLibrary } = await import('./render')
      await expect(openWithBrokenLibrary(pdfBlob())).resolves.toEqual({ status: 'error', code: 'libraryFailed' })
    } finally {
      vi.doMock('pdfjs-dist', () => pdfjsMock)
      vi.resetModules()
    }
  })
})

describe('renderPage', () => {
  it('paints a white background, then the page, then exports a JPEG', async () => {
    const log: string[] = []
    const page = fakePage({ log })
    stubDocument([page])
    stubCanvas({ log })
    const pdf = await open()

    const result = await pdf.renderPage(1, 150)

    // A4 at 150 DPI is 1240 × 1753 pixels. Transparent areas end up white because the white
    // fill comes first and PDF.js is also asked for a white background.
    expect(log).toEqual(['fillStyle #ffffff', 'fillRect 0,0,1240,1753', 'page.render', 'toBlob image/jpeg 0.92'])
    expect(result).toMatchObject({ status: 'ok', width: 1240, height: 1753 })
    expect(result.status === 'ok' && result.blob.type).toBe('image/jpeg')
  })

  it('asks PDF.js to draw into the canvas with a white background and the chosen scale', async () => {
    const page = fakePage()
    stubDocument([page])
    const { canvas } = stubCanvas()
    const pdf = await open()

    await pdf.renderPage(1, 200)

    expect(page.getViewport).toHaveBeenNthCalledWith(1, { scale: 1 })
    expect(page.getViewport).toHaveBeenNthCalledWith(2, { scale: 200 / 72 })
    expect(page.render).toHaveBeenCalledTimes(1)
    const parameters = page.render.mock.calls[0]?.[0] as { canvas: unknown; background: string; viewport: { scale: number } }
    expect(parameters.canvas).toBe(canvas)
    expect(parameters.background).toBe('#ffffff')
    expect(parameters.viewport.scale).toBeCloseTo(200 / 72, 10)
  })

  it('renders the page that was asked for', async () => {
    const pages = [fakePage(), fakePage(), fakePage()]
    const { document } = stubDocument(pages)
    stubCanvas()
    const pdf = await open()

    await pdf.renderPage(3, 100)

    expect(document.getPage).toHaveBeenCalledWith(3)
    expect(pages[2]?.render).toHaveBeenCalledTimes(1)
    expect(pages[0]?.render).not.toHaveBeenCalled()
  })

  it('reduces a page that is too large for the browser', async () => {
    const log: string[] = []
    stubDocument([fakePage({ width: 2384, height: 3370, log })]) // an A0 poster
    stubCanvas({ log })
    const pdf = await open()

    const result = await pdf.renderPage(1, 150)

    expect(result).toMatchObject({ status: 'ok', width: 3364, height: 4755 })
    expect(log).toContain('fillRect 0,0,3364,4755')
  })

  it('frees the page and the canvas after a successful render', async () => {
    const page = fakePage()
    stubDocument([page])
    const { canvas } = stubCanvas()
    const pdf = await open()

    await pdf.renderPage(1, 150)

    expect(page.cleanup).toHaveBeenCalledTimes(1)
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  })

  it('uses a new canvas for every page', async () => {
    stubDocument([fakePage(), fakePage()])
    const { createElement } = stubCanvas()
    const pdf = await open()

    await pdf.renderPage(1, 150)
    await pdf.renderPage(2, 150)

    expect(createElement).toHaveBeenCalledTimes(2)
    expect(createElement).toHaveBeenCalledWith('canvas')
  })

  describe('failures', () => {
    it('reports renderFailed when PDF.js cannot draw the page, and still cleans up', async () => {
      const page = fakePage({ renderError: true })
      stubDocument([page])
      const { canvas } = stubCanvas()
      const pdf = await open()

      await expect(pdf.renderPage(1, 150)).resolves.toEqual({ status: 'error', code: 'renderFailed' })
      expect(page.cleanup).toHaveBeenCalledTimes(1)
      expect(canvas.width).toBe(0)
    })

    it('reports renderFailed when the page cannot be loaded', async () => {
      stubDocument([fakePage()])
      stubCanvas()
      const pdf = await open()
      await expect(pdf.renderPage(5, 150)).resolves.toEqual({ status: 'error', code: 'renderFailed' })
    })

    it('reports renderFailed for a page without a usable size, without creating a canvas', async () => {
      const page = fakePage({ width: 0, height: 0 })
      stubDocument([page])
      const { createElement } = stubCanvas()
      const pdf = await open()

      await expect(pdf.renderPage(1, 150)).resolves.toEqual({ status: 'error', code: 'renderFailed' })
      expect(createElement).not.toHaveBeenCalled()
      expect(page.cleanup).toHaveBeenCalledTimes(1)
    })

    it('reports conversionFailed when there is no 2D context, without drawing the page', async () => {
      const page = fakePage()
      stubDocument([page])
      const { canvas } = stubCanvas({ hasContext: false })
      const pdf = await open()

      await expect(pdf.renderPage(1, 150)).resolves.toEqual({ status: 'error', code: 'conversionFailed' })
      expect(page.render).not.toHaveBeenCalled()
      expect(page.cleanup).toHaveBeenCalledTimes(1)
      expect(canvas.width).toBe(0)
    })

    it.each([
      ['nothing', null],
      ['an empty file', new Blob([], { type: 'image/jpeg' })],
      ['a PNG (browser without JPEG export)', new Blob([new Uint8Array([1])], { type: 'image/png' })],
    ])('reports conversionFailed when the browser exports %s', async (_label, output) => {
      const page = fakePage()
      stubDocument([page])
      const { canvas } = stubCanvas({ output })
      const pdf = await open()

      await expect(pdf.renderPage(1, 150)).resolves.toEqual({ status: 'error', code: 'conversionFailed' })
      expect(page.cleanup).toHaveBeenCalledTimes(1)
      expect(canvas.width).toBe(0)
    })

    it('reports renderFailed (instead of throwing) when the canvas cannot be created', async () => {
      const page = fakePage()
      stubDocument([page])
      vi.stubGlobal('document', {
        createElement: () => {
          throw new Error('no canvas')
        },
      })
      const pdf = await open()

      await expect(pdf.renderPage(1, 150)).resolves.toEqual({ status: 'error', code: 'renderFailed' })
      expect(page.cleanup).toHaveBeenCalledTimes(1)
    })
  })
})

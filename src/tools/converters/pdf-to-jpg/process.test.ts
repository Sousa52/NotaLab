import { describe, expect, it, vi } from 'vitest'
import { crc32 } from '../jpg-to-png/zip'
import { MAX_PDF_PAGES } from './convert'
import { convertPages, packagePages, type PageImage, type PageRenderer, type RenderPageResult } from './process'

// No PDF.js and no DOM: pages come from a fake renderer, so this checks the page loop, the
// file names and the packaging (single JPG or ZIP) on their own.

function jpegBlob(page: number, size = 8): Blob {
  const bytes = new Uint8Array(size).fill(page)
  bytes.set([0xff, 0xd8], 0)
  return new Blob([bytes], { type: 'image/jpeg' })
}

function okResult(page: number): RenderPageResult {
  return { status: 'ok', blob: jpegBlob(page), width: 100 + page, height: 200 + page }
}

interface FakeOptions {
  /** Result (or error to throw) for a page; defaults to a successful render. */
  behavior?: (page: number) => RenderPageResult | Error | undefined
}

function fakeRenderer(pageCount: number, { behavior }: FakeOptions = {}) {
  const calls: Array<{ page: number; dpi: number }> = []
  let active = 0
  let maxActive = 0
  const renderer: PageRenderer = {
    pageCount,
    async renderPage(page, dpi) {
      calls.push({ page, dpi })
      active += 1
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active -= 1
      const outcome = behavior?.(page)
      if (outcome instanceof Error) throw outcome
      return outcome ?? okResult(page)
    },
  }
  return { renderer, calls, maxActive: () => maxActive }
}

function pageImage(pageNumber: number, size = 8): PageImage {
  return { pageNumber, fileName: `doc-pagina-${pageNumber}.jpg`, blob: jpegBlob(pageNumber, size), width: 10, height: 20 }
}

describe('convertPages', () => {
  it('renders every page in order and names the images after the PDF', async () => {
    const { renderer, calls } = fakeRenderer(3)

    const result = await convertPages(renderer, { pdfName: 'documento.pdf', dpi: 150 })

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(calls.map((call) => call.page)).toEqual([1, 2, 3])
    expect(result.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3])
    expect(result.pages.map((page) => page.fileName)).toEqual([
      'documento-pagina-1.jpg',
      'documento-pagina-2.jpg',
      'documento-pagina-3.jpg',
    ])
    expect(result.pages.map((page) => [page.width, page.height])).toEqual([
      [101, 201],
      [102, 202],
      [103, 203],
    ])
    for (const page of result.pages) expect(page.blob.type).toBe('image/jpeg')
  })

  it('passes the chosen resolution to every page', async () => {
    const { renderer, calls } = fakeRenderer(2)
    await convertPages(renderer, { pdfName: 'a.pdf', dpi: 200 })
    expect(calls.map((call) => call.dpi)).toEqual([200, 200])
  })

  it('handles a one-page PDF', async () => {
    const { renderer } = fakeRenderer(1)
    const result = await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150 })
    expect(result.status === 'ok' && result.pages).toHaveLength(1)
  })

  it('handles the maximum number of pages', async () => {
    const { renderer } = fakeRenderer(MAX_PDF_PAGES)
    const result = await convertPages(renderer, { pdfName: 'a.pdf', dpi: 100 })
    expect(result.status === 'ok' && result.pages).toHaveLength(MAX_PDF_PAGES)
  })

  it('names images from a sanitised PDF name', async () => {
    const { renderer } = fakeRenderer(1)
    const result = await convertPages(renderer, { pdfName: 'Relatório: final?.PDF', dpi: 150 })
    expect(result.status === 'ok' && result.pages[0]?.fileName).toBe('Relatório- final--pagina-1.jpg')
  })

  it('renders one page at a time', async () => {
    const { renderer, maxActive } = fakeRenderer(5)
    await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150 })
    expect(maxActive()).toBe(1)
  })

  it('reports progress before each page is rendered', async () => {
    const events: string[] = []
    const { renderer } = fakeRenderer(3, {
      behavior: (page) => {
        events.push(`render ${page}`)
        return undefined
      },
    })

    await convertPages(renderer, {
      pdfName: 'a.pdf',
      dpi: 150,
      onProgress: (current, total) => events.push(`progress ${current}/${total}`),
    })

    expect(events).toEqual([
      'progress 1/3',
      'render 1',
      'progress 2/3',
      'render 2',
      'progress 3/3',
      'render 3',
    ])
  })

  it('pauses after each page so the browser can paint', async () => {
    const pause = vi.fn(() => Promise.resolve())
    const { renderer } = fakeRenderer(4)
    await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150, pause })
    expect(pause).toHaveBeenCalledTimes(4)
  })

  describe('errors', () => {
    it('stops at the first page that fails and reports which one', async () => {
      const { renderer, calls } = fakeRenderer(5, {
        behavior: (page) => (page === 3 ? { status: 'error', code: 'conversionFailed' } : undefined),
      })

      const result = await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150 })

      expect(result).toEqual({ status: 'error', code: 'conversionFailed', pageNumber: 3 })
      expect(calls.map((call) => call.page)).toEqual([1, 2, 3])
    })

    it('does not return the pages that did convert when a later one fails', async () => {
      const { renderer } = fakeRenderer(3, {
        behavior: (page) => (page === 3 ? { status: 'error', code: 'renderFailed' } : undefined),
      })
      const result = await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150 })
      expect(result).not.toHaveProperty('pages')
    })

    it('reports a failure on the first page', async () => {
      const { renderer } = fakeRenderer(2, { behavior: () => ({ status: 'error', code: 'renderFailed' }) })
      expect(await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150 })).toEqual({
        status: 'error',
        code: 'renderFailed',
        pageNumber: 1,
      })
    })

    it('turns an exception from the renderer into a renderFailed error', async () => {
      const { renderer } = fakeRenderer(3, { behavior: (page) => (page === 2 ? new Error('boom') : undefined) })
      expect(await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150 })).toEqual({
        status: 'error',
        code: 'renderFailed',
        pageNumber: 2,
      })
    })
  })

  describe('cancellation', () => {
    it('does nothing when cancelled before the first page', async () => {
      const { renderer, calls } = fakeRenderer(3)
      const onProgress = vi.fn()
      const result = await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150, isCancelled: () => true, onProgress })
      expect(result).toEqual({ status: 'cancelled' })
      expect(calls).toHaveLength(0)
      expect(onProgress).not.toHaveBeenCalled()
    })

    it('stops between pages when cancelled part-way', async () => {
      const { renderer, calls } = fakeRenderer(5)
      const result = await convertPages(renderer, {
        pdfName: 'a.pdf',
        dpi: 150,
        isCancelled: () => calls.length >= 2,
      })
      expect(result).toEqual({ status: 'cancelled' })
      expect(calls.map((call) => call.page)).toEqual([1, 2])
    })

    it('is cancelled even when it happens during the last page', async () => {
      const { renderer, calls } = fakeRenderer(2)
      const result = await convertPages(renderer, {
        pdfName: 'a.pdf',
        dpi: 150,
        isCancelled: () => calls.length >= 2,
      })
      expect(result).toEqual({ status: 'cancelled' })
    })

    it('prefers "cancelled" over an error from a page that was being rendered', async () => {
      const { renderer, calls } = fakeRenderer(3, { behavior: () => ({ status: 'error', code: 'renderFailed' }) })
      const result = await convertPages(renderer, { pdfName: 'a.pdf', dpi: 150, isCancelled: () => calls.length >= 1 })
      expect(result).toEqual({ status: 'cancelled' })
    })
  })
})

interface ZipFile {
  name: string
  crc: number
  data: Uint8Array
}

/** A small independent ZIP reader (stored entries only), used to check the generated archive. */
function readZip(bytes: Uint8Array): ZipFile[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = bytes.length - 22
  expect(view.getUint32(end, true)).toBe(0x06054b50)
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)

  const files: ZipFile[] = []
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50)
    expect(view.getUint16(offset + 10, true)).toBe(0) // stored, not compressed
    const crc = view.getUint32(offset + 16, true)
    const size = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength))

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50)
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true)
    files.push({ name, crc, data: bytes.subarray(dataStart, dataStart + size) })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return files
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

describe('packagePages', () => {
  it('refuses to package nothing', async () => {
    await expect(packagePages([], 'a.pdf')).rejects.toBeInstanceOf(RangeError)
  })

  it('gives a one-page PDF as a single JPG, not a ZIP', async () => {
    const page = pageImage(1)
    const result = await packagePages([page], 'doc.pdf')
    expect(result.kind).toBe('jpg')
    expect(result.fileName).toBe('doc-pagina-1.jpg')
    expect(result.blob).toBe(page.blob)
    expect(result.blob.type).toBe('image/jpeg')
  })

  it('gives a multi-page PDF as one ZIP named after the PDF', async () => {
    const result = await packagePages([pageImage(1), pageImage(2)], 'Relatório Final.PDF')
    expect(result.kind).toBe('zip')
    expect(result.fileName).toBe('Relatório Final-jpg.zip')
    expect(result.blob.type).toBe('application/zip')
  })

  it('puts one JPG per page in the ZIP, in page order, with the original bytes', async () => {
    const pages = [pageImage(1, 8), pageImage(2, 20), pageImage(3, 5)]
    const result = await packagePages(pages, 'doc.pdf')

    const files = readZip(await bytesOf(result.blob))

    expect(files.map((file) => file.name)).toEqual(['doc-pagina-1.jpg', 'doc-pagina-2.jpg', 'doc-pagina-3.jpg'])
    for (const [index, file] of files.entries()) {
      expect(Array.from(file.data)).toEqual(Array.from(await bytesOf(pages[index]?.blob ?? new Blob())))
    }
  })

  it('stores a correct CRC-32 for every file', async () => {
    const result = await packagePages([pageImage(1, 30), pageImage(2, 31)], 'doc.pdf')
    for (const file of readZip(await bytesOf(result.blob))) {
      expect(file.crc).toBe(crc32(file.data))
    }
  })

  it('keeps page order beyond page 9 (not alphabetical)', async () => {
    const pages = Array.from({ length: 12 }, (_, index) => pageImage(index + 1))
    const files = readZip(await bytesOf((await packagePages(pages, 'doc.pdf')).blob))
    expect(files.map((file) => file.name)).toEqual(Array.from({ length: 12 }, (_, index) => `doc-pagina-${index + 1}.jpg`))
  })

  it('makes names unique if two pages ever share one', async () => {
    const duplicate = { ...pageImage(2), fileName: 'doc-pagina-1.jpg' }
    const files = readZip(await bytesOf((await packagePages([pageImage(1), duplicate], 'doc.pdf')).blob))
    expect(files.map((file) => file.name)).toEqual(['doc-pagina-1.jpg', 'doc-pagina-1 (2).jpg'])
  })

  it('packages the maximum number of pages', async () => {
    const pages = Array.from({ length: MAX_PDF_PAGES }, (_, index) => pageImage(index + 1))
    const files = readZip(await bytesOf((await packagePages(pages, 'doc.pdf')).blob))
    expect(files).toHaveLength(MAX_PDF_PAGES)
  })

  it('names the ZIP "documento-jpg.zip" for a PDF without a usable name', async () => {
    const result = await packagePages([pageImage(1), pageImage(2)], '.pdf')
    expect(result.fileName).toBe('documento-jpg.zip')
  })
})

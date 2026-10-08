import { describe, expect, it } from 'vitest'
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  decodePDFRawStream,
  type PDFObject,
  type PDFPage,
} from 'pdf-lib'
import { A4_HEIGHT_PT, A4_WIDTH_PT, fitImageToPage, type PageLayout } from './layout'
import { createPdf, type PdfPageInput } from './pdf'

// pdf-lib runs in Node, so the real PDF generation is exercised here. The input images are
// tiny JPEGs: a real 16 × 8 baseline JPEG whose header size is rewritten for other sizes
// (pdf-lib only reads the header, and these tests never render pixels).
const BASE_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAIABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDMooorkPoD/9k='

/** Decodes bytes as Latin-1 text (enough to look for ASCII markers in a PDF). */
function latin1(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes)
}

/** The base JPEG with its header size set to `width` × `height`. */
function makeJpeg(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = Uint8Array.from(atob(BASE_JPEG_BASE64), (character) => character.charCodeAt(0))
  for (let i = 0; i < bytes.length - 8; i += 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xc0) {
      // SOF0: marker (2), length (2), precision (1), height (2), width (2).
      bytes[i + 5] = height >> 8
      bytes[i + 6] = height & 0xff
      bytes[i + 7] = width >> 8
      bytes[i + 8] = width & 0xff
      return bytes
    }
  }
  throw new Error('The base JPEG has no SOF0 marker')
}

function pageFor(width: number, height: number, jpeg: Blob | Uint8Array = makeJpeg(width, height)): PdfPageInput {
  const layout = fitImageToPage(width, height)
  if (!layout) throw new Error('Expected a layout')
  return { jpeg, layout }
}

interface ReadPage {
  width: number
  height: number
  images: Array<{ width: number; height: number; dict: PDFDict }>
  /** All numbers of the page's `cm` operators, in order. */
  matrices: number[][]
}

function readPages(bytes: Uint8Array): Promise<ReadPage[]> {
  return PDFDocument.load(bytes, { updateMetadata: false }).then((document) =>
    document.getPages().map((page) => describePage(document, page)),
  )
}

function rawStream(document: PDFDocument, ref: PDFObject | undefined): PDFRawStream | undefined {
  const object = ref ? document.context.lookup(ref) : undefined
  return object instanceof PDFRawStream ? object : undefined
}

function describePage(document: PDFDocument, page: PDFPage): ReadPage {
  const { width, height } = page.getSize()
  const xObjects = page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict)
  const images = (xObjects?.entries() ?? []).map(([, ref]) => {
    const stream = rawStream(document, ref)
    if (!stream) throw new Error('The image is not a raw stream')
    return {
      width: stream.dict.lookup(PDFName.of('Width'), PDFNumber).asNumber(),
      height: stream.dict.lookup(PDFName.of('Height'), PDFNumber).asNumber(),
      dict: stream.dict,
    }
  })

  const contents = page.node.Contents()
  const streams = contents instanceof PDFArray ? contents.asArray() : [contents]
  let text = ''
  for (const entry of streams) {
    const stream = rawStream(document, entry)
    if (stream) text += `${latin1(decodePDFRawStream(stream).decode())}\n`
  }
  const matrices = [...text.matchAll(/((?:-?[\d.]+\s+){5}-?[\d.]+)\s+cm/g)].map((match) =>
    (match[1] ?? '').trim().split(/\s+/).map(Number),
  )
  return { width, height, images, matrices }
}

/** Where the image is drawn: pdf-lib writes translate (x, y), rotate, then scale (width, height). */
function drawnBox(page: ReadPage): { x: number; y: number; width: number; height: number } {
  const translate = page.matrices.find((m) => m[0] === 1 && m[3] === 1 && (m[4] !== 0 || m[5] !== 0))
  const scale = page.matrices.find((m) => m[1] === 0 && m[2] === 0 && m[4] === 0 && m[5] === 0 && m[0] !== 1)
  if (!translate || !scale) throw new Error('No drawing matrices found')
  return { x: translate[4] ?? 0, y: translate[5] ?? 0, width: scale[0] ?? 0, height: scale[3] ?? 0 }
}

const LANDSCAPE = pageFor(16, 8)
const PORTRAIT = pageFor(8, 16)
const SQUARE = pageFor(12, 12)

describe('createPdf: input checks', () => {
  it('rejects an empty list of pages', async () => {
    await expect(createPdf([])).rejects.toBeInstanceOf(RangeError)
  })

  it.each<[string, Partial<PageLayout>]>([
    ['a NaN width', { width: NaN }],
    ['a zero width', { width: 0 }],
    ['a negative height', { height: -1 }],
    ['an infinite x', { x: Infinity }],
    ['a zero page width', { pageWidth: 0 }],
    ['a NaN page height', { pageHeight: NaN }],
  ])('rejects a layout with %s', async (_label, override) => {
    const page: PdfPageInput = { jpeg: makeJpeg(16, 8), layout: { ...LANDSCAPE.layout, ...override } }
    await expect(createPdf([page])).rejects.toBeInstanceOf(RangeError)
  })

  it('rejects data that is not a JPEG', async () => {
    const notJpeg = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    await expect(createPdf([{ jpeg: notJpeg, layout: LANDSCAPE.layout }])).rejects.toThrow()
  })
})

describe('createPdf: output', () => {
  it('creates a well-formed PDF without object streams', async () => {
    const bytes = await createPdf([PORTRAIT])
    const text = latin1(bytes)
    expect(text.startsWith('%PDF-')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(text).not.toContain('/ObjStm')
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
  })

  it('sets NotaLab as the producer and creator', async () => {
    const document = await PDFDocument.load(await createPdf([PORTRAIT]), { updateMetadata: false })
    expect(document.getProducer()).toBe('NotaLab')
    expect(document.getCreator()).toBe('NotaLab')
  })

  it('puts exactly one image on each page', async () => {
    const pages = await readPages(await createPdf([LANDSCAPE, PORTRAIT, SQUARE]))
    expect(pages).toHaveLength(3)
    for (const page of pages) expect(page.images).toHaveLength(1)
  })

  it('uses A4 pages in the orientation of each image', async () => {
    const pages = await readPages(await createPdf([LANDSCAPE, PORTRAIT, SQUARE]))
    expect([pages[0]?.width, pages[0]?.height]).toEqual([A4_HEIGHT_PT, A4_WIDTH_PT].map((v) => expect.closeTo(v, 2)))
    expect([pages[1]?.width, pages[1]?.height]).toEqual([A4_WIDTH_PT, A4_HEIGHT_PT].map((v) => expect.closeTo(v, 2)))
    expect([pages[2]?.width, pages[2]?.height]).toEqual([A4_WIDTH_PT, A4_HEIGHT_PT].map((v) => expect.closeTo(v, 2)))
  })

  it('keeps the page order of the list', async () => {
    const forward = await readPages(await createPdf([LANDSCAPE, PORTRAIT, SQUARE]))
    expect(forward.map((page) => [page.images[0]?.width, page.images[0]?.height])).toEqual([
      [16, 8],
      [8, 16],
      [12, 12],
    ])

    const reversed = await readPages(await createPdf([SQUARE, PORTRAIT, LANDSCAPE]))
    expect(reversed.map((page) => [page.images[0]?.width, page.images[0]?.height])).toEqual([
      [12, 12],
      [8, 16],
      [16, 8],
    ])
  })

  it('draws each image where the layout says: centred, scaled uniformly, not cropped', async () => {
    const pages = await readPages(await createPdf([LANDSCAPE, PORTRAIT]))
    for (const [index, input] of [LANDSCAPE, PORTRAIT].entries()) {
      const page = pages[index]
      if (!page) throw new Error('Missing page')
      const box = drawnBox(page)
      expect(box.x).toBeCloseTo(input.layout.x, 2)
      expect(box.y).toBeCloseTo(input.layout.y, 2)
      expect(box.width).toBeCloseTo(input.layout.width, 2)
      expect(box.height).toBeCloseTo(input.layout.height, 2)
      expect(box.x + box.width / 2).toBeCloseTo(page.width / 2, 1)
      expect(box.y + box.height / 2).toBeCloseTo(page.height / 2, 1)
      const image = page.images[0]
      expect(box.width / box.height).toBeCloseTo((image?.width ?? 0) / (image?.height ?? 1), 2)
    }
  })

  it('embeds RGB JPEG data with no transparency mask', async () => {
    const [page] = await readPages(await createPdf([PORTRAIT]))
    const dict = page?.images[0]?.dict
    expect(dict?.lookup(PDFName.of('Filter'))?.toString()).toBe('/DCTDecode')
    expect(dict?.lookup(PDFName.of('ColorSpace'))?.toString()).toBe('/DeviceRGB')
    expect(dict?.has(PDFName.of('SMask'))).toBe(false)
  })

  it('accepts a Blob as well as bytes', async () => {
    const blob = new Blob([makeJpeg(16, 8)], { type: 'image/jpeg' })
    const pages = await readPages(await createPdf([pageFor(16, 8, blob)]))
    expect(pages[0]?.images[0]?.width).toBe(16)
  })

  it('reads bytes that are a view into a larger buffer', async () => {
    const jpeg = makeJpeg(16, 8)
    const padded = new Uint8Array(jpeg.length + 20)
    padded.set(jpeg, 7)
    const view = padded.subarray(7, 7 + jpeg.length)
    const pages = await readPages(await createPdf([pageFor(16, 8, view)]))
    expect(pages[0]?.images[0]?.width).toBe(16)
  })

  it('creates a PDF with the maximum of 50 pages', async () => {
    const pages = Array.from({ length: 50 }, () => PORTRAIT)
    expect((await readPages(await createPdf(pages))).length).toBe(50)
  })
})

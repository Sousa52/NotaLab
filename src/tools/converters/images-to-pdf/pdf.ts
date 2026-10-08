// PDF creation for the Images → PDF tool, using `pdf-lib` (the only PDF dependency; it runs in the
// browser and in Node). It is loaded with a dynamic import, so it becomes its own chunk that is
// only downloaded when a PDF is actually created.
//
// Every page holds exactly one image, already prepared as an RGB JPEG by `convertImage.ts`
// (decoded by the browser, so JPG, PNG and WebP all arrive in the same form; transparent areas
// were painted white before encoding, so no alpha channel or soft mask ever reaches the PDF).
// Where the image goes on the page comes from `layout.ts`.

import type { PageLayout } from './layout'

export interface PdfPageInput {
  /** The page image as JPEG file data. */
  jpeg: Blob | Uint8Array
  /** Page size and image placement, in PDF points (see `fitImageToPage`). */
  layout: PageLayout
}

function isValidLayout(layout: PageLayout): boolean {
  return (
    layout.pageWidth > 0 &&
    layout.pageHeight > 0 &&
    layout.width > 0 &&
    layout.height > 0 &&
    [layout.pageWidth, layout.pageHeight, layout.x, layout.y, layout.width, layout.height].every((value) =>
      Number.isFinite(value),
    )
  )
}

/**
 * Always a fresh copy that starts at byte 0. `pdf-lib` reads JPEGs through `data.buffer`, so a
 * `Uint8Array` that is a view into a larger buffer (non-zero offset) would otherwise be misread.
 */
async function toBytes(data: Blob | Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  return data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : new Uint8Array(data)
}

/**
 * Creates a PDF with one page per entry, in the given order.
 *
 * @throws RangeError when there are no pages or a page layout is invalid.
 * @throws Error (from pdf-lib) when a page's data is not a readable JPEG.
 */
export async function createPdf(pages: readonly PdfPageInput[]): Promise<Uint8Array<ArrayBuffer>> {
  if (pages.length === 0) throw new RangeError('A PDF needs at least one page.')
  if (pages.some((page) => !isValidLayout(page.layout))) throw new RangeError('A page has an invalid layout.')

  const { PDFDocument } = await import('pdf-lib')
  const document = await PDFDocument.create()
  document.setProducer('NotaLab')
  document.setCreator('NotaLab')

  for (const { jpeg, layout } of pages) {
    const image = await document.embedJpg(await toBytes(jpeg))
    const page = document.addPage([layout.pageWidth, layout.pageHeight])
    // PDF coordinates start at the bottom-left corner, like the layout does.
    page.drawImage(image, { x: layout.x, y: layout.y, width: layout.width, height: layout.height })
  }

  // No object streams: plain cross-reference tables are readable by every PDF viewer.
  return new Uint8Array(await document.save({ useObjectStreams: false }))
}

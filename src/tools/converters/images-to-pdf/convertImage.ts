// Browser-only image preparation for the Images → PDF tool. Each image is decoded by the browser
// (`createImageBitmap`, which also applies the photo's EXIF orientation), painted over a white
// background on a canvas, and exported as an RGB JPEG that `pdf-lib` can embed. This is how WebP
// (which pdf-lib cannot embed) and PNG (including transparent ones) end up in the same, safe form.
// Pure helpers live in `convert.ts` (unit-tested); this file needs a real browser (Canvas), so only
// its early exits, which return before any decoding, are covered by Vitest.
//
// Transparency: JPEG has no alpha channel, so transparent pixels become white and semi-transparent
// ones blend with white. PDF pages are white, so the page looks the same; no alpha channel or soft
// mask is ever written, which keeps the PDF simple and valid.

import { validateDimensions } from '../jpg-to-png/convert'
import { BACKGROUND_COLOR, JPEG_QUALITY, calculateEmbedSize, detectImageFormat } from './convert'

/** Enough to recognise JPEG, PNG and WebP signatures. */
const HEADER_BYTES = 12

export type PrepareErrorCode =
  | 'invalidImage'
  | 'decodeFailed'
  | 'tooManyPixels'
  | 'conversionFailed'
  | 'browserUnsupported'

export type PrepareResult =
  | {
      status: 'ok'
      /** The page image as JPEG data. */
      jpeg: Blob
      /** Pixel size of the JPEG (the original size, scaled down only if over the embed limit). */
      width: number
      height: number
    }
  | { status: 'error'; code: PrepareErrorCode }

function failure(code: PrepareErrorCode): PrepareResult {
  return { status: 'error', code }
}

/** Reads just the first bytes of the file; `null` if it cannot be read. */
async function readHeader(file: Blob): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Prepares one JPG, PNG or WebP image for a PDF page. The real content is checked first (magic
 * numbers), so a file is accepted or refused whatever its name or MIME type says.
 *
 * Never throws: unreadable files, content that is not one of the three formats, decoding
 * problems and conversion problems all come back as an error result. The decoded bitmap and the
 * canvas memory are released before returning.
 */
export async function prepareImageForPdf(file: Blob): Promise<PrepareResult> {
  const header = await readHeader(file)
  if (!header) return failure('decodeFailed')
  if (detectImageFormat(header) === null) return failure('invalidImage')
  if (typeof createImageBitmap !== 'function') return failure('browserUnsupported')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return failure('decodeFailed')
  }

  try {
    const dimensions = validateDimensions(bitmap.width, bitmap.height)
    if (dimensions.status === 'error') {
      return failure(dimensions.code === 'tooManyPixels' ? 'tooManyPixels' : 'decodeFailed')
    }
    const size = calculateEmbedSize(bitmap.width, bitmap.height)
    if (!size) return failure('decodeFailed')

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) return failure('conversionFailed')

    context.fillStyle = BACKGROUND_COLOR
    context.fillRect(0, 0, size.width, size.height)
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))

    // Free the canvas backing store right away instead of waiting for garbage collection.
    canvas.width = 0
    canvas.height = 0

    // A browser that cannot encode JPEG falls back to PNG; treat that as a failure.
    if (!jpeg || jpeg.size === 0 || jpeg.type !== 'image/jpeg') return failure('conversionFailed')
    return { status: 'ok', jpeg, width: size.width, height: size.height }
  } catch {
    return failure('conversionFailed')
  } finally {
    bitmap.close()
  }
}

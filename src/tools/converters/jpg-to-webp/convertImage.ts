// Browser-only conversion: decodes a JPEG with `createImageBitmap`, draws it on a canvas at its
// original size and exports WebP with `canvas.toBlob`. Nothing is uploaded anywhere. Pure
// helpers live in `convert.ts` (unit-tested); this file needs a real browser (Canvas), so its
// decisions are tested with mocked browser APIs. The result/error types and the download
// helper are shared with the JPG → PNG converter.

import { validateDimensions } from '../jpg-to-png/convert'
import type { ConvertErrorCode, ConvertResult } from '../jpg-to-png/convertImage'
import { WEBP_MIME_TYPE } from './convert'

/** The shared conversion errors, plus the browser being unable to encode WebP. */
export type WebpConvertErrorCode = ConvertErrorCode | 'webpUnsupported'

export type WebpConvertResult =
  | Extract<ConvertResult, { status: 'ok' }>
  | { status: 'error'; code: WebpConvertErrorCode }

function failure(code: WebpConvertErrorCode): WebpConvertResult {
  return { status: 'error', code }
}

/**
 * Converts one JPEG image to WebP at its original dimensions (the aspect ratio is untouched
 * because the canvas has exactly the image's size). `quality` is the 0–1 value for
 * `canvas.toBlob` (see `toCanvasQuality`).
 *
 * JPEG has no transparency, so there is nothing to paint behind the image: it covers the
 * whole canvas.
 *
 * Never throws: decoding and conversion problems come back as an error result. A browser
 * that cannot encode WebP silently returns a PNG from `toBlob`; that is reported as
 * `webpUnsupported` instead of handing the user a PNG named ".webp". The decoded bitmap and
 * the canvas backing store are released as soon as the blob exists, so converting many large
 * images one after another does not pile up memory.
 */
export async function convertJpegToWebp(file: Blob, quality: number): Promise<WebpConvertResult> {
  if (typeof createImageBitmap !== 'function') return failure('unsupported')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return failure('decodeFailed')
  }

  try {
    const { width, height } = bitmap
    const dimensions = validateDimensions(width, height)
    if (dimensions.status === 'error') {
      return failure(dimensions.code === 'tooManyPixels' ? 'tooManyPixels' : 'decodeFailed')
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return failure('conversionFailed')

    context.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, WEBP_MIME_TYPE, quality))

    // Free the canvas backing store right away instead of waiting for garbage collection.
    canvas.width = 0
    canvas.height = 0

    if (!blob || blob.size === 0) return failure('conversionFailed')
    if (blob.type !== WEBP_MIME_TYPE) return failure('webpUnsupported')
    return { status: 'ok', blob, width, height }
  } catch {
    return failure('conversionFailed')
  } finally {
    bitmap.close()
  }
}

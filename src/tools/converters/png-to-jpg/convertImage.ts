// Browser-only conversion: decodes a PNG with `createImageBitmap`, paints it over a white
// background on a canvas at its original size and exports JPEG with `canvas.toBlob`. Nothing
// is uploaded anywhere. Pure helpers live in `convert.ts` (unit-tested); this file needs a
// real browser (Canvas), so it is not covered by Vitest. The result/error types and the
// download helper are shared with the JPG → PNG converter.

import { validateDimensions } from '../jpg-to-png/convert'
import type { ConvertErrorCode, ConvertResult } from '../jpg-to-png/convertImage'

function failure(code: ConvertErrorCode): ConvertResult {
  return { status: 'error', code }
}

/**
 * Converts one PNG image to JPEG at its original dimensions.
 *
 * JPEG has no transparency, so the canvas is filled with white first; transparent pixels end
 * up white and semi-transparent ones blend with white. `quality` is the 0–1 value for
 * `canvas.toBlob` (see `toCanvasQuality`).
 *
 * Never throws: decoding and conversion problems come back as an error result. The decoded
 * bitmap and the canvas backing store are released as soon as the JPEG blob exists, so
 * converting many large images one after another does not pile up memory.
 */
export async function convertPngToJpg(file: Blob, quality: number): Promise<ConvertResult> {
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

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))

    // Free the canvas backing store right away instead of waiting for garbage collection.
    canvas.width = 0
    canvas.height = 0

    // A browser that cannot encode JPEG falls back to PNG; treat that as a failure.
    if (!blob || blob.size === 0 || blob.type !== 'image/jpeg') return failure('conversionFailed')
    return { status: 'ok', blob, width, height }
  } catch {
    return failure('conversionFailed')
  } finally {
    bitmap.close()
  }
}

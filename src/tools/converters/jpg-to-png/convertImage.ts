// Browser-only conversion: decodes an image with `createImageBitmap`, draws it on a canvas at
// its original size and exports PNG with `canvas.toBlob`. Nothing is uploaded anywhere.
// Pure validation/naming helpers live in `convert.ts` (and are unit-tested); this file needs
// a real browser (Canvas), so it is not covered by Vitest.

import { validateDimensions } from './convert'

export type ConvertErrorCode = 'unsupported' | 'decodeFailed' | 'tooManyPixels' | 'conversionFailed'

export type ConvertResult =
  | { status: 'ok'; blob: Blob; width: number; height: number }
  | { status: 'error'; code: ConvertErrorCode }

function failure(code: ConvertErrorCode): ConvertResult {
  return { status: 'error', code }
}

/**
 * Converts one JPEG image to PNG at its original dimensions. Never throws: decoding and
 * conversion problems come back as an error result. The decoded bitmap and the canvas
 * backing store are released as soon as the PNG blob exists, so converting many large images
 * one after another does not pile up memory.
 */
export async function convertJpegToPng(file: Blob): Promise<ConvertResult> {
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
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

    // Free the canvas backing store right away instead of waiting for garbage collection.
    canvas.width = 0
    canvas.height = 0

    if (!blob || blob.size === 0) return failure('conversionFailed')
    return { status: 'ok', blob, width, height }
  } catch {
    return failure('conversionFailed')
  } finally {
    bitmap.close()
  }
}

/** Starts a browser download of a blob, then revokes its temporary URL. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers, so wait a moment.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

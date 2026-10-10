import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_PIXELS } from '../jpg-to-png/convert'
import { WEBP_MIME_TYPE, toCanvasQuality, DEFAULT_QUALITY } from './convert'
import { convertJpegToWebp } from './convertImage'

// `convertImage.ts` needs a real browser (decoding and Canvas). These tests replace
// `createImageBitmap` and `document` with small fakes, so they check the decisions the code
// makes (what it refuses, how it sizes the canvas, what it asks the encoder for, what counts as
// a failure), not how a real browser decodes or encodes. The encoded pixels are not tested.

const JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])], {
  type: 'image/jpeg',
})

function fakeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() }
}

function stubDecoder(bitmap: ReturnType<typeof fakeBitmap>) {
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
}

interface CanvasOptions {
  /** What `toBlob` hands back. */
  output?: Blob | null
  /** `false` makes `getContext` return null. */
  hasContext?: boolean
  /** Makes `drawImage` throw. */
  drawFails?: boolean
}

const WEBP_OUTPUT = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4])], { type: WEBP_MIME_TYPE })

function stubCanvas({ output = WEBP_OUTPUT, hasContext = true, drawFails = false }: CanvasOptions = {}) {
  const calls: string[] = []
  const context = {
    drawImage: vi.fn((_image: unknown, x: number, y: number) => {
      if (drawFails) throw new Error('draw failed')
      calls.push(`drawImage ${x},${y} on ${canvas.width}x${canvas.height}`)
    }),
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (hasContext ? context : null)),
    toBlob: vi.fn((callback: (blob: Blob | null) => void, type?: string, quality?: number) => {
      calls.push(`toBlob ${type} ${quality}`)
      callback(output)
    }),
  }
  const createElement = vi.fn(() => canvas)
  vi.stubGlobal('document', { createElement })
  return { canvas, context, createElement, calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('convertJpegToWebp: successful conversion', () => {
  it('draws the image unscaled on a canvas of its own size and exports WebP at the given quality', async () => {
    const bitmap = fakeBitmap(800, 600)
    stubDecoder(bitmap)
    const { calls, context, createElement } = stubCanvas()

    const result = await convertJpegToWebp(JPEG, 0.85)

    expect(result).toEqual({ status: 'ok', blob: WEBP_OUTPUT, width: 800, height: 600 })
    expect(createElement).toHaveBeenCalledWith('canvas')
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0)
    expect(calls).toEqual(['drawImage 0,0 on 800x600', 'toBlob image/webp 0.85'])
  })

  it('decodes the file that was given', async () => {
    stubDecoder(fakeBitmap(10, 10))
    stubCanvas()
    await convertJpegToWebp(JPEG, 0.85)
    expect(vi.mocked(createImageBitmap)).toHaveBeenCalledWith(JPEG)
  })

  it('returns a WebP blob', async () => {
    stubDecoder(fakeBitmap(10, 10))
    stubCanvas()
    const result = await convertJpegToWebp(JPEG, 0.85)
    expect(result.status === 'ok' && result.blob.type).toBe('image/webp')
  })

  it.each([
    [4000, 3000],
    [3000, 4000],
    [1, 1],
    [1, 5000],
    [6016, 4000],
  ])('keeps the dimensions and aspect ratio of a %d × %d image', async (width, height) => {
    stubDecoder(fakeBitmap(width, height))
    const { calls } = stubCanvas()

    const result = await convertJpegToWebp(JPEG, 0.85)

    expect(result).toMatchObject({ status: 'ok', width, height })
    expect(calls[0]).toBe(`drawImage 0,0 on ${width}x${height}`)
  })

  it('accepts an image of exactly the maximum number of pixels', async () => {
    stubDecoder(fakeBitmap(10000, MAX_PIXELS / 10000))
    stubCanvas()
    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toMatchObject({ status: 'ok' })
  })

  it.each([0.85, 0.5, 1, 0.1])('passes quality %d to the encoder', async (quality) => {
    stubDecoder(fakeBitmap(10, 10))
    const { canvas } = stubCanvas()
    await convertJpegToWebp(JPEG, quality)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', quality)
  })

  it('uses 0.85 with the default quality setting', async () => {
    stubDecoder(fakeBitmap(10, 10))
    const { canvas } = stubCanvas()
    await convertJpegToWebp(JPEG, toCanvasQuality(DEFAULT_QUALITY))
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.85)
  })

  it('frees the bitmap and the canvas memory afterwards', async () => {
    const bitmap = fakeBitmap(800, 600)
    stubDecoder(bitmap)
    const { canvas } = stubCanvas()

    await convertJpegToWebp(JPEG, 0.85)

    expect(bitmap.close).toHaveBeenCalledTimes(1)
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  })
})

describe('convertJpegToWebp: files that cannot be decoded', () => {
  it('reports unsupported when the browser cannot decode images', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'unsupported' })
  })

  it('reports decodeFailed for a corrupt file', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('The source image could not be decoded.')))
    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'decodeFailed' })
  })

  it('reports decodeFailed for an empty file', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('empty')))
    await expect(convertJpegToWebp(new Blob([]), 0.85)).resolves.toEqual({ status: 'error', code: 'decodeFailed' })
  })

  it('refuses images with too many pixels, without creating a canvas, and frees the bitmap', async () => {
    const bitmap = fakeBitmap(10001, 10000)
    stubDecoder(bitmap)
    const { createElement } = stubCanvas()

    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'tooManyPixels' })
    expect(createElement).not.toHaveBeenCalled()
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it.each([
    [0, 100],
    [100, 0],
  ])('reports decodeFailed for a decoded size of %d × %d', async (width, height) => {
    const bitmap = fakeBitmap(width, height)
    stubDecoder(bitmap)
    const { createElement } = stubCanvas()

    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'decodeFailed' })
    expect(createElement).not.toHaveBeenCalled()
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})

describe('convertJpegToWebp: WebP encoding failures', () => {
  it('reports webpUnsupported when the browser falls back to PNG, instead of returning it', async () => {
    stubDecoder(fakeBitmap(100, 100))
    stubCanvas({ output: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }) })

    const result = await convertJpegToWebp(JPEG, 0.85)

    expect(result).toEqual({ status: 'error', code: 'webpUnsupported' })
    expect(result).not.toHaveProperty('blob')
  })

  it('reports webpUnsupported when the browser falls back to JPEG', async () => {
    stubDecoder(fakeBitmap(100, 100))
    stubCanvas({ output: new Blob([new Uint8Array([1])], { type: 'image/jpeg' }) })
    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'webpUnsupported' })
  })

  it('reports conversionFailed when the encoder returns nothing', async () => {
    stubDecoder(fakeBitmap(100, 100))
    stubCanvas({ output: null })
    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'conversionFailed' })
  })

  it('reports conversionFailed when the encoder returns an empty file', async () => {
    stubDecoder(fakeBitmap(100, 100))
    stubCanvas({ output: new Blob([], { type: 'image/webp' }) })
    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'conversionFailed' })
  })

  it('reports conversionFailed when there is no 2D context', async () => {
    const bitmap = fakeBitmap(100, 100)
    stubDecoder(bitmap)
    stubCanvas({ hasContext: false })

    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'conversionFailed' })
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('reports conversionFailed (instead of throwing) when drawing fails, and frees the bitmap', async () => {
    const bitmap = fakeBitmap(100, 100)
    stubDecoder(bitmap)
    stubCanvas({ drawFails: true })

    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'conversionFailed' })
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('reports conversionFailed (instead of throwing) when the canvas cannot be created', async () => {
    const bitmap = fakeBitmap(100, 100)
    stubDecoder(bitmap)
    vi.stubGlobal('document', {
      createElement: () => {
        throw new Error('no canvas')
      },
    })

    await expect(convertJpegToWebp(JPEG, 0.85)).resolves.toEqual({ status: 'error', code: 'conversionFailed' })
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('does not call the encoder when drawing fails', async () => {
    stubDecoder(fakeBitmap(100, 100))
    const { canvas } = stubCanvas({ drawFails: true })
    await convertJpegToWebp(JPEG, 0.85)
    expect(canvas.toBlob).not.toHaveBeenCalled()
  })
})

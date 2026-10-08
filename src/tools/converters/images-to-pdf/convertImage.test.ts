import { afterEach, describe, expect, it, vi } from 'vitest'
import { BACKGROUND_COLOR, JPEG_QUALITY, MAX_EMBED_DIMENSION } from './convert'
import { prepareImageForPdf } from './convertImage'

// `convertImage.ts` needs a real browser (decoding and Canvas). These tests replace
// `createImageBitmap` and `document` with small fakes, so they check the decisions the code
// makes (what it refuses, how it sizes and paints the canvas, what counts as a failure), not
// how a real browser renders. The pixels themselves are not tested here.

const SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d],
  webp: [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
}

function blobOf(bytes: number[]): Blob {
  return new Blob([new Uint8Array(bytes)])
}

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
}

function stubCanvas({ output = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), hasContext = true }: CanvasOptions = {}) {
  const calls: string[] = []
  const context = {
    set fillStyle(value: string) {
      calls.push(`fillStyle ${value}`)
    },
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      calls.push(`fillRect ${x},${y},${width},${height}`)
    }),
    drawImage: vi.fn((_image: unknown, x: number, y: number, width: number, height: number) => {
      calls.push(`drawImage ${x},${y},${width},${height}`)
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
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
  return { canvas, calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('prepareImageForPdf: content checks', () => {
  it.each([
    ['an empty file', []],
    ['plain text', [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64]],
    ['a GIF', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00]],
    ['a PDF', [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]],
  ])('refuses %s whatever it is called', async (_label, bytes) => {
    const decoder = vi.fn()
    vi.stubGlobal('createImageBitmap', decoder)
    await expect(prepareImageForPdf(blobOf(bytes))).resolves.toEqual({ status: 'error', code: 'invalidImage' })
    expect(decoder).not.toHaveBeenCalled()
  })

  it('reports decodeFailed when the file cannot be read', async () => {
    const unreadable = {
      slice: () => ({ arrayBuffer: () => Promise.reject(new Error('read failed')) }),
    } as unknown as Blob
    await expect(prepareImageForPdf(unreadable)).resolves.toEqual({ status: 'error', code: 'decodeFailed' })
  })

  it.each(['jpeg', 'png', 'webp'] as const)('accepts the %s signature and moves on to decoding', async (format) => {
    vi.stubGlobal('createImageBitmap', undefined)
    await expect(prepareImageForPdf(blobOf(SIGNATURES[format]))).resolves.toEqual({
      status: 'error',
      code: 'browserUnsupported',
    })
  })
})

describe('prepareImageForPdf: decoding problems', () => {
  it('reports decodeFailed when the browser cannot decode the image', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad image')))
    await expect(prepareImageForPdf(blobOf(SIGNATURES.png))).resolves.toEqual({ status: 'error', code: 'decodeFailed' })
  })

  it('refuses images with too many pixels and still frees the bitmap', async () => {
    const bitmap = fakeBitmap(20000, 20000)
    stubDecoder(bitmap)
    await expect(prepareImageForPdf(blobOf(SIGNATURES.jpeg))).resolves.toEqual({
      status: 'error',
      code: 'tooManyPixels',
    })
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('reports decodeFailed for a decoded size of zero', async () => {
    const bitmap = fakeBitmap(0, 100)
    stubDecoder(bitmap)
    await expect(prepareImageForPdf(blobOf(SIGNATURES.webp))).resolves.toEqual({ status: 'error', code: 'decodeFailed' })
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})

describe('prepareImageForPdf: preparing the page image', () => {
  it('paints a white background first, then the image, and exports a JPEG', async () => {
    const bitmap = fakeBitmap(800, 400)
    stubDecoder(bitmap)
    const jpeg = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
    const { calls } = stubCanvas({ output: jpeg })

    const result = await prepareImageForPdf(blobOf(SIGNATURES.png))

    expect(result).toEqual({ status: 'ok', jpeg, width: 800, height: 400 })
    // Transparent PNG/WebP areas end up white because the white fill comes before the drawing.
    expect(BACKGROUND_COLOR).toBe('#ffffff')
    expect(calls).toEqual([
      `fillStyle ${BACKGROUND_COLOR}`,
      'fillRect 0,0,800,400',
      'drawImage 0,0,800,400',
      `toBlob image/jpeg ${JPEG_QUALITY}`,
    ])
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('scales images above the embed limit down, keeping the aspect ratio', async () => {
    stubDecoder(fakeBitmap(7016, 4960))
    const { calls } = stubCanvas()

    const result = await prepareImageForPdf(blobOf(SIGNATURES.jpeg))

    expect(result).toMatchObject({ status: 'ok', width: MAX_EMBED_DIMENSION, height: 2480 })
    expect(calls).toContain(`fillRect 0,0,${MAX_EMBED_DIMENSION},2480`)
    expect(calls).toContain(`drawImage 0,0,${MAX_EMBED_DIMENSION},2480`)
  })

  it('leaves images within the limit at their own size', async () => {
    stubDecoder(fakeBitmap(3508, 2480))
    stubCanvas()
    await expect(prepareImageForPdf(blobOf(SIGNATURES.jpeg))).resolves.toMatchObject({
      status: 'ok',
      width: 3508,
      height: 2480,
    })
  })

  it('releases the canvas memory after exporting', async () => {
    stubDecoder(fakeBitmap(800, 400))
    const { canvas } = stubCanvas()
    await prepareImageForPdf(blobOf(SIGNATURES.png))
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  })
})

describe('prepareImageForPdf: conversion problems', () => {
  it('reports conversionFailed when there is no 2D context', async () => {
    const bitmap = fakeBitmap(100, 100)
    stubDecoder(bitmap)
    stubCanvas({ hasContext: false })
    await expect(prepareImageForPdf(blobOf(SIGNATURES.png))).resolves.toEqual({
      status: 'error',
      code: 'conversionFailed',
    })
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['nothing', null],
    ['an empty file', new Blob([], { type: 'image/jpeg' })],
    ['a PNG (browser without JPEG export)', new Blob([new Uint8Array([1])], { type: 'image/png' })],
  ])('reports conversionFailed when the browser exports %s', async (_label, output) => {
    const bitmap = fakeBitmap(100, 100)
    stubDecoder(bitmap)
    stubCanvas({ output })
    await expect(prepareImageForPdf(blobOf(SIGNATURES.webp))).resolves.toEqual({
      status: 'error',
      code: 'conversionFailed',
    })
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('reports conversionFailed (instead of throwing) when drawing fails', async () => {
    const bitmap = fakeBitmap(100, 100)
    stubDecoder(bitmap)
    vi.stubGlobal('document', {
      createElement: () => {
        throw new Error('no canvas')
      },
    })
    await expect(prepareImageForPdf(blobOf(SIGNATURES.png))).resolves.toEqual({
      status: 'error',
      code: 'conversionFailed',
    })
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})

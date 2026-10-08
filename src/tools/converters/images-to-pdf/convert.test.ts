import { describe, expect, it } from 'vitest'
import { MAX_FILES, MAX_FILE_SIZE_BYTES } from '../jpg-to-png/convert'
import {
  BACKGROUND_COLOR,
  JPEG_QUALITY,
  MAX_EMBED_DIMENSION,
  PDF_FILE_NAME,
  calculateEmbedSize,
  detectImageFormat,
  moveItem,
  takeAvailableSlots,
  validateImageFile,
} from './convert'

// Pure helpers only: no Canvas, no DOM, no PDF library — these run in a plain Node environment.

describe('constants', () => {
  it('uses the agreed limits and output settings', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024)
    expect(MAX_FILES).toBe(50)
    expect(MAX_EMBED_DIMENSION).toBe(3508)
    expect(BACKGROUND_COLOR).toBe('#ffffff')
    expect(JPEG_QUALITY).toBeGreaterThan(0)
    expect(JPEG_QUALITY).toBeLessThanOrEqual(1)
    expect(PDF_FILE_NAME).toBe('imagens.pdf')
  })
})

describe('validateImageFile', () => {
  const ok = { status: 'ok' }

  describe('supported formats', () => {
    it.each([
      ['photo.jpg', 'image/jpeg'],
      ['photo.jpeg', 'image/jpeg'],
      ['photo.jpg', 'image/jpg'],
      ['photo.jpg', 'image/pjpeg'],
      ['picture.png', 'image/png'],
      ['picture.png', 'image/x-png'],
      ['picture.webp', 'image/webp'],
    ])('accepts %s (%s)', (name, type) => {
      expect(validateImageFile({ name, type, size: 1024 })).toEqual(ok)
    })

    it.each(['photo.jpg', 'photo.JPG', 'photo.jpeg', 'photo.JPEG', 'picture.png', 'picture.PNG', 'picture.webp', 'picture.WebP'])(
      'accepts an untyped file named %s',
      (name) => {
        expect(validateImageFile({ name, type: '', size: 1024 })).toEqual(ok)
      },
    )

    it('reads the MIME type case-insensitively', () => {
      expect(validateImageFile({ name: 'a.png', type: 'IMAGE/PNG', size: 1024 })).toEqual(ok)
      expect(validateImageFile({ name: 'a.webp', type: 'Image/WebP', size: 1024 })).toEqual(ok)
    })

    it('trusts a supported MIME type over an unusual file name', () => {
      expect(validateImageFile({ name: 'photo.dat', type: 'image/jpeg', size: 1024 })).toEqual(ok)
      expect(validateImageFile({ name: 'photo.jpg', type: 'image/png', size: 1024 })).toEqual(ok)
    })
  })

  describe('invalid formats', () => {
    it.each([
      ['a.gif', 'image/gif'],
      ['a.svg', 'image/svg+xml'],
      ['a.bmp', 'image/bmp'],
      ['a.tiff', 'image/tiff'],
      ['a.heic', 'image/heic'],
      ['a.pdf', 'application/pdf'],
      ['a.txt', 'text/plain'],
      ['a.zip', 'application/zip'],
      ['a.jpg', 'application/pdf'],
    ])('rejects %s (%s) as unsupported', (name, type) => {
      expect(validateImageFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'unsupported' })
    })

    it.each(['a.gif', 'a.txt', 'a.pdf', 'readme', 'jpg', 'photo.jpgx', 'photo.png.exe'])(
      'rejects an untyped file named %s',
      (name) => {
        expect(validateImageFile({ name, type: '', size: 1024 })).toEqual({ status: 'error', code: 'unsupported' })
      },
    )

    it('reports an unsupported format before an empty or oversized file', () => {
      expect(validateImageFile({ name: 'a.gif', type: 'image/gif', size: 0 })).toEqual({
        status: 'error',
        code: 'unsupported',
      })
      expect(validateImageFile({ name: 'a.gif', type: 'image/gif', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
        status: 'error',
        code: 'unsupported',
      })
    })
  })

  describe('empty files', () => {
    it.each([
      ['a.jpg', 'image/jpeg'],
      ['a.png', 'image/png'],
      ['a.webp', 'image/webp'],
      ['a.jpg', ''],
      ['a.png', ''],
      ['a.webp', ''],
    ])('rejects an empty %s (%j)', (name, type) => {
      expect(validateImageFile({ name, type, size: 0 })).toEqual({ status: 'error', code: 'empty' })
    })

    it('rejects a negative size as empty', () => {
      expect(validateImageFile({ name: 'a.png', type: 'image/png', size: -1 })).toEqual({
        status: 'error',
        code: 'empty',
      })
    })

    it('accepts a one-byte file (its content is checked later)', () => {
      expect(validateImageFile({ name: 'a.png', type: 'image/png', size: 1 })).toEqual(ok)
    })
  })

  describe('20 MB limit', () => {
    it.each([
      ['a.jpg', 'image/jpeg'],
      ['a.png', 'image/png'],
      ['a.webp', 'image/webp'],
    ])('accepts a %s of exactly 20 MB', (name, type) => {
      expect(validateImageFile({ name, type, size: MAX_FILE_SIZE_BYTES })).toEqual(ok)
    })

    it.each([
      ['a.jpg', 'image/jpeg'],
      ['a.png', 'image/png'],
      ['a.webp', 'image/webp'],
    ])('rejects a %s above 20 MB', (name, type) => {
      expect(validateImageFile({ name, type, size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
        status: 'error',
        code: 'tooLarge',
      })
    })

    it('applies the limit to untyped files with a supported extension', () => {
      expect(validateImageFile({ name: 'a.webp', type: '', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
        status: 'error',
        code: 'tooLarge',
      })
    })
  })
})

describe('detectImageFormat', () => {
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]

  it('recognises JPEG', () => {
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))).toBe('jpeg')
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe1]))).toBe('jpeg')
  })

  it('recognises PNG', () => {
    expect(detectImageFormat(new Uint8Array([...PNG, 0x00, 0x00, 0x00, 0x0d]))).toBe('png')
  })

  it('recognises WebP', () => {
    expect(detectImageFormat(new Uint8Array(WEBP))).toBe('webp')
  })

  it('does not take other RIFF files (such as WAV) for WebP', () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]
    expect(detectImageFormat(new Uint8Array(wav))).toBeNull()
  })

  it.each([
    ['GIF', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00]],
    ['PDF', [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]],
    ['plain text', [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64]],
    ['SVG text', [0x3c, 0x73, 0x76, 0x67, 0x20]],
    ['zeros', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ])('returns null for %s', (_label, bytes) => {
    expect(detectImageFormat(new Uint8Array(bytes))).toBeNull()
  })

  it('returns null for an empty file', () => {
    expect(detectImageFormat(new Uint8Array(0))).toBeNull()
  })

  it('returns null for files that are too short to hold the signature', () => {
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8]))).toBeNull()
    expect(detectImageFormat(new Uint8Array(PNG.slice(0, 7)))).toBeNull()
    expect(detectImageFormat(new Uint8Array(WEBP.slice(0, 11)))).toBeNull()
  })
})

describe('calculateEmbedSize', () => {
  it.each([
    [1, 1],
    [800, 600],
    [3508, 2480],
    [2480, 3508],
    [3508, 3508],
  ])('keeps %d × %d unchanged (within the limit)', (width, height) => {
    expect(calculateEmbedSize(width, height)).toEqual({ width, height })
  })

  it('scales a wide image down so its longest side is 3508 px', () => {
    expect(calculateEmbedSize(4000, 2000)).toEqual({ width: 3508, height: 1754 })
    expect(calculateEmbedSize(5000, 3000)).toEqual({ width: 3508, height: 2105 })
  })

  it('scales a tall image down so its longest side is 3508 px', () => {
    expect(calculateEmbedSize(2000, 4000)).toEqual({ width: 1754, height: 3508 })
  })

  it('keeps the aspect ratio when scaling down', () => {
    const size = calculateEmbedSize(8000, 6000)
    expect(size).toEqual({ width: 3508, height: 2631 })
    expect((size?.width ?? 0) / (size?.height ?? 1)).toBeCloseTo(8000 / 6000, 3)
  })

  it('scales an image that is one pixel over the limit to exactly the limit', () => {
    expect(calculateEmbedSize(3509, 3509)).toEqual({ width: 3508, height: 3508 })
  })

  it('never lets a side drop below 1 px', () => {
    expect(calculateEmbedSize(10000, 1)).toEqual({ width: 3508, height: 1 })
    expect(calculateEmbedSize(1, 10000)).toEqual({ width: 1, height: 3508 })
  })

  it.each([
    [0, 10],
    [10, 0],
    [-1, 5],
    [5, -1],
    [1.5, 2],
    [2, 1.5],
    [NaN, 2],
    [2, Infinity],
  ])('returns null for invalid size %d × %d', (width, height) => {
    expect(calculateEmbedSize(width, height)).toBeNull()
  })
})

describe('moveItem (page order)', () => {
  it('moves an item down', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item up', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('swaps two neighbours', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b'])
  })

  it('moves to the first and last position', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('returns an unchanged copy when nothing moves', () => {
    const items = ['a', 'b', 'c']
    const result = moveItem(items, 1, 1)
    expect(result).toEqual(items)
    expect(result).not.toBe(items)
  })

  it.each([
    [-1, 0],
    [0, 3],
    [3, 0],
    [0, -1],
    [1.5, 0],
    [0, NaN],
  ])('returns an unchanged copy for out-of-range or invalid indexes (%d → %d)', (from, to) => {
    const items = ['a', 'b', 'c']
    const result = moveItem(items, from, to)
    expect(result).toEqual(['a', 'b', 'c'])
    expect(result).not.toBe(items)
  })

  it('does not change the original list', () => {
    const items = ['a', 'b', 'c']
    moveItem(items, 0, 2)
    expect(items).toEqual(['a', 'b', 'c'])
  })

  it('handles empty and single-item lists', () => {
    expect(moveItem([], 0, 0)).toEqual([])
    expect(moveItem(['a'], 0, 0)).toEqual(['a'])
    expect(moveItem(['a'], 0, 1)).toEqual(['a'])
  })

  it('keeps every item exactly once after several moves', () => {
    let items = ['a', 'b', 'c', 'd', 'e']
    items = moveItem(items, 0, 4)
    items = moveItem(items, 3, 1)
    items = moveItem(items, 2, 0)
    expect([...items].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(items).toEqual(['c', 'b', 'e', 'd', 'a'])
  })
})

describe('takeAvailableSlots (50-file limit)', () => {
  const files = (count: number) => Array.from({ length: count }, (_, index) => `file-${index + 1}`)

  it('accepts everything while there is room', () => {
    expect(takeAvailableSlots(files(3), 0)).toEqual({ accepted: files(3), ignored: 0 })
    expect(takeAvailableSlots(files(3), 10)).toEqual({ accepted: files(3), ignored: 0 })
  })

  it('accepts exactly 50 files into an empty list', () => {
    const result = takeAvailableSlots(files(50), 0)
    expect(result.accepted).toHaveLength(50)
    expect(result.ignored).toBe(0)
  })

  it('leaves out the 51st file and keeps the first 50 in order', () => {
    const result = takeAvailableSlots(files(51), 0)
    expect(result.accepted).toEqual(files(50))
    expect(result.ignored).toBe(1)
  })

  it('counts the images already in the list', () => {
    const result = takeAvailableSlots(files(45), 10)
    expect(result.accepted).toEqual(files(40))
    expect(result.ignored).toBe(5)
  })

  it('accepts nothing when the list is already full', () => {
    expect(takeAvailableSlots(files(4), 50)).toEqual({ accepted: [], ignored: 4 })
  })

  it('never gives a negative amount of room', () => {
    expect(takeAvailableSlots(files(2), 60)).toEqual({ accepted: [], ignored: 2 })
  })

  it('treats a negative current count as an empty list', () => {
    expect(takeAvailableSlots(files(2), -5)).toEqual({ accepted: files(2), ignored: 0 })
  })

  it('handles no new files', () => {
    expect(takeAvailableSlots([], 0)).toEqual({ accepted: [], ignored: 0 })
  })

  it('accepts a custom limit', () => {
    expect(takeAvailableSlots(files(5), 1, 3)).toEqual({ accepted: files(2), ignored: 3 })
  })

  it('returns a new array and leaves the input alone', () => {
    const incoming = files(3)
    const result = takeAvailableSlots(incoming, 0)
    expect(result.accepted).not.toBe(incoming)
    expect(incoming).toEqual(files(3))
  })
})

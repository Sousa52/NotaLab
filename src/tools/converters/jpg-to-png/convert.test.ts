import { describe, expect, it } from 'vitest'
import {
  JPEG_MIME_TYPES,
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
  MAX_PIXELS,
  formatFileSize,
  getPngFileName,
  hasJpegExtension,
  makeUniqueFileNames,
  validateDimensions,
  validateJpegFile,
} from './convert'

// Pure helpers only: no Canvas, no DOM, no timezone — these run in a plain Node environment.

/** Expected pt-PT number formatting, independent of the exact ICU data in use. */
function pt(value: number): string {
  return value.toLocaleString('pt-PT', { maximumFractionDigits: 1 })
}

describe('constants', () => {
  it('uses sensible limits', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024)
    expect(MAX_FILES).toBe(50)
    expect(MAX_PIXELS).toBe(100_000_000)
    expect([...JPEG_MIME_TYPES]).toContain('image/jpeg')
  })
})

describe('hasJpegExtension', () => {
  it.each(['photo.jpg', 'photo.JPG', 'photo.jpeg', 'Photo.JPEG', 'my.photo.jpg', ' photo.jpg '])(
    'accepts %j',
    (name) => {
      expect(hasJpegExtension(name)).toBe(true)
    },
  )

  it.each(['photo.png', 'photo.jpg.png', 'photo', 'jpg', 'photo.jpgx', 'photo.jpe'])('rejects %j', (name) => {
    expect(hasJpegExtension(name)).toBe(false)
  })
})

describe('validateJpegFile', () => {
  const ok = { status: 'ok' }

  it('accepts a JPEG file', () => {
    expect(validateJpegFile({ name: 'photo.jpg', type: 'image/jpeg', size: 1024 })).toEqual(ok)
  })

  it.each(['image/jpg', 'image/pjpeg'])('accepts the %s alias', (type) => {
    expect(validateJpegFile({ name: 'photo.jpg', type, size: 1024 })).toEqual(ok)
  })

  it('reads the MIME type case-insensitively', () => {
    expect(validateJpegFile({ name: 'photo.jpg', type: 'IMAGE/JPEG', size: 1024 })).toEqual(ok)
  })

  it.each(['photo.jpg', 'photo.JPEG'])('accepts an untyped file named %s', (name) => {
    expect(validateJpegFile({ name, type: '', size: 1024 })).toEqual(ok)
  })

  it('trusts a JPEG MIME type over an unusual file name', () => {
    expect(validateJpegFile({ name: 'photo.png', type: 'image/jpeg', size: 1024 })).toEqual(ok)
  })

  it.each([
    ['image/png', 'a.png'],
    ['image/gif', 'a.gif'],
    ['application/pdf', 'a.pdf'],
    ['text/plain', 'a.txt'],
    ['image/webp', 'a.webp'],
    ['image/png', 'a.jpg'],
  ])('rejects %s (%s)', (type, name) => {
    expect(validateJpegFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notJpeg' })
  })

  it.each([
    ['', 'a.png'],
    ['', 'readme'],
  ])('rejects an untyped file that is not named like a JPEG (%j, %s)', (type, name) => {
    expect(validateJpegFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notJpeg' })
  })

  it('rejects an empty file', () => {
    expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size: 0 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a negative size', () => {
    expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size: -1 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a file above the maximum size', () => {
    expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'tooLarge',
    })
  })

  it('accepts a file of exactly the maximum size', () => {
    expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES })).toEqual(ok)
  })

  it('accepts a one-byte file', () => {
    expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size: 1 })).toEqual(ok)
  })

  it('reports the wrong type before the size', () => {
    expect(validateJpegFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'notJpeg',
    })
  })
})

describe('validateDimensions', () => {
  it.each([
    [1, 1],
    [4000, 3000],
    [10000, 10000],
  ])('accepts %d × %d', (width, height) => {
    expect(validateDimensions(width, height)).toEqual({ status: 'ok' })
  })

  it.each([
    [0, 100],
    [100, 0],
    [-1, 5],
    [5, -1],
    [1.5, 2],
    [NaN, 2],
    [2, Infinity],
  ])('rejects invalid dimensions %d × %d', (width, height) => {
    expect(validateDimensions(width, height)).toEqual({ status: 'error', code: 'invalidDimensions' })
  })

  it.each([
    [10001, 10000],
    [20000, 20000],
  ])('rejects %d × %d as too many pixels', (width, height) => {
    expect(validateDimensions(width, height)).toEqual({ status: 'error', code: 'tooManyPixels' })
  })
})

describe('getPngFileName', () => {
  it.each([
    ['photo.jpg', 'photo.png'],
    ['photo.JPG', 'photo.png'],
    ['photo.jpeg', 'photo.png'],
    ['Photo.JPEG', 'Photo.png'],
    ['my.photo.jpg', 'my.photo.png'],
    ['holiday photo (1).jpg', 'holiday photo (1).png'],
    ['fotografia-ação.jpeg', 'fotografia-ação.png'],
    ['noextension', 'noextension.png'],
    ['photo.png', 'photo.png'],
    ['  spaced.jpg  ', 'spaced.png'],
    ['.jpg', 'imagem.png'],
    ['', 'imagem.png'],
    ['photo.jpg.jpg', 'photo.jpg.png'],
  ])('%j → %j', (input, expected) => {
    expect(getPngFileName(input)).toBe(expected)
  })
})

describe('makeUniqueFileNames', () => {
  it('leaves unique names unchanged', () => {
    expect(makeUniqueFileNames(['a.png', 'b.png', 'c.png'])).toEqual(['a.png', 'b.png', 'c.png'])
  })

  it('numbers duplicates before the extension', () => {
    expect(makeUniqueFileNames(['a.png', 'a.png', 'a.png'])).toEqual(['a.png', 'a (2).png', 'a (3).png'])
  })

  it('treats names case-insensitively', () => {
    expect(makeUniqueFileNames(['a.png', 'A.png'])).toEqual(['a.png', 'A (2).png'])
  })

  it('skips numbers that are already taken', () => {
    expect(makeUniqueFileNames(['a.png', 'a (2).png', 'a.png'])).toEqual(['a.png', 'a (2).png', 'a (3).png'])
  })

  it('handles names without an extension', () => {
    expect(makeUniqueFileNames(['file', 'file'])).toEqual(['file', 'file (2)'])
  })

  it('keeps the order and length of a mixed list', () => {
    expect(makeUniqueFileNames(['b.png', 'a.png', 'b.png', 'c.png'])).toEqual([
      'b.png',
      'a.png',
      'b (2).png',
      'c.png',
    ])
  })

  it('returns an empty list for no names', () => {
    expect(makeUniqueFileNames([])).toEqual([])
  })

  it('treats a leading dot as part of the name, not an extension', () => {
    expect(makeUniqueFileNames(['.png', '.png'])).toEqual(['.png', '.png (2)'])
  })
})

describe('formatFileSize', () => {
  it.each([0, -5, NaN, Infinity])('shows %d as 0 B', (bytes) => {
    expect(formatFileSize(bytes)).toBe('0 B')
  })

  it.each([
    [1, '1 B'],
    [512, '512 B'],
    [1023, '1023 B'],
  ])('shows %d bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected)
  })

  it.each([
    [1024, 1],
    [1536, 1.5],
    [10240, 10],
  ])('shows %d bytes in KB', (bytes, kilobytes) => {
    expect(formatFileSize(bytes)).toBe(`${pt(kilobytes)} KB`)
  })

  it.each([
    [1024 * 1024, 1],
    [2.5 * 1024 * 1024, 2.5],
    [20 * 1024 * 1024, 20],
  ])('shows %d bytes in MB', (bytes, megabytes) => {
    expect(formatFileSize(bytes)).toBe(`${pt(megabytes)} MB`)
  })

  it('rounds to one decimal place', () => {
    expect(formatFileSize(1234)).toBe(`${pt(1234 / 1024)} KB`)
  })
})

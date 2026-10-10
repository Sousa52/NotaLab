import { describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE_BYTES, validateJpegFile } from '../jpg-to-png/convert'
import {
  DEFAULT_QUALITY,
  MAX_QUALITY,
  MIN_QUALITY,
  WEBP_MIME_TYPE,
  clampQuality,
  getWebpFileName,
  toCanvasQuality,
} from './convert'

// Pure helpers only: no Canvas, no DOM — these run in a plain Node environment.

describe('constants', () => {
  it('defaults to 85% quality within a 10–100% range, and outputs WebP', () => {
    expect(DEFAULT_QUALITY).toBe(85)
    expect(MIN_QUALITY).toBe(10)
    expect(MAX_QUALITY).toBe(100)
    expect(WEBP_MIME_TYPE).toBe('image/webp')
  })

  it('turns the default quality into 0.85 for the canvas', () => {
    expect(toCanvasQuality(DEFAULT_QUALITY)).toBeCloseTo(0.85, 10)
  })
})

describe('getWebpFileName', () => {
  it.each([
    ['photo.jpg', 'photo.webp'],
    ['photo.JPG', 'photo.webp'],
    ['photo.jpeg', 'photo.webp'],
    ['Photo.JPEG', 'Photo.webp'],
    ['my.photo.jpg', 'my.photo.webp'],
    ['holiday photo (1).jpg', 'holiday photo (1).webp'],
    ['fotografia-ação.jpeg', 'fotografia-ação.webp'],
    ['captura-ecrã 2024.JPG', 'captura-ecrã 2024.webp'],
    ['noextension', 'noextension.webp'],
    ['  spaced.jpg  ', 'spaced.webp'],
    ['photo.jpg.jpg', 'photo.jpg.webp'],
    ['photo.jpgx', 'photo.jpgx.webp'],
  ])('%j → %j', (input, expected) => {
    expect(getWebpFileName(input)).toBe(expected)
  })

  it('does not leave a second extension on a JPEG-typed file named differently', () => {
    expect(getWebpFileName('photo.png')).toBe('photo.webp')
    expect(getWebpFileName('photo.webp')).toBe('photo.webp')
  })

  it.each(['', '   ', '.jpg', '.jpeg'])('uses "imagem" when there is no base name (%j)', (input) => {
    expect(getWebpFileName(input)).toBe('imagem.webp')
  })
})

describe('clampQuality', () => {
  it.each([
    [85, 85],
    [10, 10],
    [100, 100],
    [9, 10],
    [0, 10],
    [-5, 10],
    [101, 100],
    [1000, 100],
    [84.6, 85],
    [84.4, 84],
    [NaN, 85],
    [Infinity, 85],
    [-Infinity, 85],
  ])('%d → %d', (input, expected) => {
    expect(clampQuality(input)).toBe(expected)
  })
})

describe('toCanvasQuality', () => {
  it.each([
    [85, 0.85],
    [100, 1],
    [10, 0.1],
    [50, 0.5],
    [0, 0.1],
    [150, 1],
    [NaN, 0.85],
  ])('%d%% → %d', (percent, expected) => {
    expect(toCanvasQuality(percent)).toBeCloseTo(expected, 10)
  })
})

// This tool accepts files through the JPG validation shared with JPG → PNG; these cases check
// what matters for it: which files get through, and which error each rejected file reports.
describe('input validation (validateJpegFile)', () => {
  const ok = { status: 'ok' }

  describe('valid JPG and JPEG files', () => {
    it.each([
      ['photo.jpg', 'image/jpeg'],
      ['photo.jpeg', 'image/jpeg'],
      ['photo.JPG', 'image/jpeg'],
      ['photo.jpg', 'image/jpg'],
      ['photo.jpg', 'image/pjpeg'],
      ['photo.jpg', 'IMAGE/JPEG'],
    ])('accepts %s (%s)', (name, type) => {
      expect(validateJpegFile({ name, type, size: 1024 })).toEqual(ok)
    })

    it.each(['photo.jpg', 'photo.jpeg', 'photo.JPG', 'photo.JPEG'])('accepts an untyped file named %s', (name) => {
      expect(validateJpegFile({ name, type: '', size: 1024 })).toEqual(ok)
    })
  })

  describe('invalid files', () => {
    it.each([
      ['image/png', 'a.png'],
      ['image/webp', 'a.webp'],
      ['image/gif', 'a.gif'],
      ['image/svg+xml', 'a.svg'],
      ['application/pdf', 'a.pdf'],
      ['text/plain', 'a.txt'],
      ['image/png', 'a.jpg'],
    ])('rejects %s (%s) as not a JPEG', (type, name) => {
      expect(validateJpegFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notJpeg' })
    })

    it.each(['a.png', 'a.webp', 'readme', 'jpg', 'a.jpgx'])('rejects an untyped file named %s', (name) => {
      expect(validateJpegFile({ name, type: '', size: 1024 })).toEqual({ status: 'error', code: 'notJpeg' })
    })
  })

  describe('empty files', () => {
    it.each([0, -1])('rejects a size of %d as empty', (size) => {
      expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size })).toEqual({
        status: 'error',
        code: 'empty',
      })
    })

    it('accepts a one-byte file (its content is checked when it is decoded)', () => {
      expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size: 1 })).toEqual(ok)
    })
  })

  describe('oversized files', () => {
    it('accepts a file of exactly 20 MB', () => {
      expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES })).toEqual(ok)
    })

    it('rejects a file above 20 MB', () => {
      expect(validateJpegFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
        status: 'error',
        code: 'tooLarge',
      })
    })

    it('reports a wrong format before a size problem', () => {
      expect(validateJpegFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
        status: 'error',
        code: 'notJpeg',
      })
    })
  })
})

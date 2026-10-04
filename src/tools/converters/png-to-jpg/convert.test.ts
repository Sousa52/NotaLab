import { describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE_BYTES } from '../jpg-to-png/convert'
import {
  DEFAULT_QUALITY,
  MAX_QUALITY,
  MIN_QUALITY,
  PNG_MIME_TYPES,
  clampQuality,
  getJpgFileName,
  hasPngExtension,
  toCanvasQuality,
  validatePngFile,
} from './convert'

// Pure helpers only: no Canvas, no DOM — these run in a plain Node environment.

describe('constants', () => {
  it('defaults to 90% quality within a 10–100% range', () => {
    expect(DEFAULT_QUALITY).toBe(90)
    expect(MIN_QUALITY).toBe(10)
    expect(MAX_QUALITY).toBe(100)
    expect([...PNG_MIME_TYPES]).toContain('image/png')
  })
})

describe('hasPngExtension', () => {
  it.each(['photo.png', 'photo.PNG', 'Photo.Png', 'my.photo.png', ' photo.png '])('accepts %j', (name) => {
    expect(hasPngExtension(name)).toBe(true)
  })

  it.each(['photo.jpg', 'photo.png.jpg', 'photo', 'png', 'photo.pngx', 'photo.apng'])('rejects %j', (name) => {
    expect(hasPngExtension(name)).toBe(false)
  })
})

describe('validatePngFile', () => {
  const ok = { status: 'ok' }

  it('accepts a PNG file', () => {
    expect(validatePngFile({ name: 'photo.png', type: 'image/png', size: 1024 })).toEqual(ok)
  })

  it('accepts the image/x-png alias', () => {
    expect(validatePngFile({ name: 'photo.png', type: 'image/x-png', size: 1024 })).toEqual(ok)
  })

  it('reads the MIME type case-insensitively', () => {
    expect(validatePngFile({ name: 'photo.png', type: 'IMAGE/PNG', size: 1024 })).toEqual(ok)
  })

  it.each(['photo.png', 'photo.PNG'])('accepts an untyped file named %s', (name) => {
    expect(validatePngFile({ name, type: '', size: 1024 })).toEqual(ok)
  })

  it('trusts a PNG MIME type over an unusual file name', () => {
    expect(validatePngFile({ name: 'photo.jpg', type: 'image/png', size: 1024 })).toEqual(ok)
  })

  it.each([
    ['image/jpeg', 'a.jpg'],
    ['image/gif', 'a.gif'],
    ['application/pdf', 'a.pdf'],
    ['image/webp', 'a.webp'],
    ['image/svg+xml', 'a.svg'],
    ['image/jpeg', 'a.png'],
  ])('rejects %s (%s)', (type, name) => {
    expect(validatePngFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notPng' })
  })

  it.each([
    ['', 'a.jpg'],
    ['', 'readme'],
  ])('rejects an untyped file that is not named like a PNG (%j, %s)', (type, name) => {
    expect(validatePngFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notPng' })
  })

  it('rejects an empty file', () => {
    expect(validatePngFile({ name: 'a.png', type: 'image/png', size: 0 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a negative size', () => {
    expect(validatePngFile({ name: 'a.png', type: 'image/png', size: -1 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a file above the 20 MB limit', () => {
    expect(validatePngFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'tooLarge',
    })
  })

  it('accepts a file of exactly the maximum size', () => {
    expect(validatePngFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE_BYTES })).toEqual(ok)
  })

  it('accepts a one-byte file', () => {
    expect(validatePngFile({ name: 'a.png', type: 'image/png', size: 1 })).toEqual(ok)
  })

  it('reports the wrong type before the size', () => {
    expect(validatePngFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'notPng',
    })
  })
})

describe('getJpgFileName', () => {
  it.each([
    ['photo.png', 'photo.jpg'],
    ['photo.PNG', 'photo.jpg'],
    ['Photo.Png', 'Photo.jpg'],
    ['my.photo.png', 'my.photo.jpg'],
    ['holiday photo (1).png', 'holiday photo (1).jpg'],
    ['captura-ecrã.png', 'captura-ecrã.jpg'],
    ['noextension', 'noextension.jpg'],
    ['photo.jpg', 'photo.jpg'],
    ['photo.jpeg', 'photo.jpg'],
    ['  spaced.png  ', 'spaced.jpg'],
    ['.png', 'imagem.jpg'],
    ['', 'imagem.jpg'],
    ['photo.png.png', 'photo.png.jpg'],
  ])('%j → %j', (input, expected) => {
    expect(getJpgFileName(input)).toBe(expected)
  })
})

describe('clampQuality', () => {
  it.each([
    [90, 90],
    [10, 10],
    [100, 100],
    [9, 10],
    [0, 10],
    [-5, 10],
    [101, 100],
    [1000, 100],
    [89.6, 90],
    [89.4, 89],
    [NaN, 90],
    [Infinity, 90],
    [-Infinity, 90],
  ])('%d → %d', (input, expected) => {
    expect(clampQuality(input)).toBe(expected)
  })
})

describe('toCanvasQuality', () => {
  it.each([
    [90, 0.9],
    [100, 1],
    [10, 0.1],
    [50, 0.5],
    [0, 0.1],
    [150, 1],
    [NaN, 0.9],
  ])('%d%% → %d', (percent, expected) => {
    expect(toCanvasQuality(percent)).toBeCloseTo(expected, 10)
  })
})

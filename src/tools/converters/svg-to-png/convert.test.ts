import { describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE_BYTES } from '../jpg-to-png/convert'
import {
  DEFAULT_OUTPUT_ID,
  MAX_OUTPUT_DIMENSION,
  MAX_OUTPUT_PIXELS,
  OUTPUT_OPTIONS,
  SVG_MIME_TYPES,
  calculateOutputSize,
  getOutputSetting,
  getPngFileNameFromSvg,
  hasSvgExtension,
  validateSvgFile,
} from './convert'

// Pure helpers only: no Canvas, no DOM — these run in a plain Node environment. Shared pieces
// (file-size limit, size formatting, unique names, ZIP writer) are tested with the other
// converters.

describe('constants', () => {
  it('limits the output to 16 384 px per side and 50 megapixels', () => {
    expect(MAX_OUTPUT_DIMENSION).toBe(16384)
    expect(MAX_OUTPUT_PIXELS).toBe(50_000_000)
    expect([...SVG_MIME_TYPES]).toEqual(['image/svg+xml'])
  })

  it('has a default output option that exists in the list', () => {
    expect(OUTPUT_OPTIONS.some((option) => option.id === DEFAULT_OUTPUT_ID)).toBe(true)
    expect(DEFAULT_OUTPUT_ID).toBe('scale-2')
  })
})

describe('hasSvgExtension', () => {
  it.each(['logo.svg', 'logo.SVG', 'Logo.Svg', 'my.logo.svg', ' logo.svg '])('accepts %j', (name) => {
    expect(hasSvgExtension(name)).toBe(true)
  })

  it.each(['logo.png', 'logo.svg.png', 'logo', 'svg', 'logo.svgz', 'logo.svgx'])('rejects %j', (name) => {
    expect(hasSvgExtension(name)).toBe(false)
  })
})

describe('validateSvgFile', () => {
  const ok = { status: 'ok' }

  it('accepts an SVG file', () => {
    expect(validateSvgFile({ name: 'logo.svg', type: 'image/svg+xml', size: 1024 })).toEqual(ok)
  })

  it('reads the MIME type case-insensitively', () => {
    expect(validateSvgFile({ name: 'logo.svg', type: 'IMAGE/SVG+XML', size: 1024 })).toEqual(ok)
  })

  it.each(['', 'text/xml', 'application/xml', 'text/plain', 'application/octet-stream'])(
    'accepts a .svg file reported as %j',
    (type) => {
      expect(validateSvgFile({ name: 'logo.svg', type, size: 1024 })).toEqual(ok)
    },
  )

  it('trusts the SVG MIME type over an unusual file name', () => {
    expect(validateSvgFile({ name: 'logo.xml', type: 'image/svg+xml', size: 1024 })).toEqual(ok)
  })

  it.each([
    ['image/png', 'a.png'],
    ['image/jpeg', 'a.jpg'],
    ['text/html', 'a.html'],
    ['application/pdf', 'a.pdf'],
    ['image/png', 'a.svg'],
    ['text/html', 'a.svg'],
  ])('rejects %s (%s)', (type, name) => {
    expect(validateSvgFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notSvg' })
  })

  it.each([
    ['', 'a.png'],
    ['text/plain', 'notes.txt'],
    ['text/xml', 'data.xml'],
  ])('rejects a generic file that is not named .svg (%j, %s)', (type, name) => {
    expect(validateSvgFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notSvg' })
  })

  it('rejects an empty file', () => {
    expect(validateSvgFile({ name: 'a.svg', type: 'image/svg+xml', size: 0 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a negative size', () => {
    expect(validateSvgFile({ name: 'a.svg', type: 'image/svg+xml', size: -1 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a file above the 20 MB limit', () => {
    expect(validateSvgFile({ name: 'a.svg', type: 'image/svg+xml', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'tooLarge',
    })
  })

  it('accepts a file of exactly the maximum size', () => {
    expect(validateSvgFile({ name: 'a.svg', type: 'image/svg+xml', size: MAX_FILE_SIZE_BYTES })).toEqual(ok)
  })

  it('accepts a one-byte file (its content is checked later)', () => {
    expect(validateSvgFile({ name: 'a.svg', type: 'image/svg+xml', size: 1 })).toEqual(ok)
  })

  it('reports the wrong type before the size', () => {
    expect(validateSvgFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'notSvg',
    })
  })
})

describe('getPngFileNameFromSvg', () => {
  it.each([
    ['logo.svg', 'logo.png'],
    ['logo.SVG', 'logo.png'],
    ['Logo.Svg', 'Logo.png'],
    ['my.logo.svg', 'my.logo.png'],
    ['icon (1).svg', 'icon (1).png'],
    ['ícone-ação.svg', 'ícone-ação.png'],
    ['noextension', 'noextension.png'],
    ['logo.png', 'logo.png'],
    ['  spaced.svg  ', 'spaced.png'],
    ['.svg', 'imagem.png'],
    ['', 'imagem.png'],
    ['logo.svg.svg', 'logo.svg.png'],
  ])('%j → %j', (input, expected) => {
    expect(getPngFileNameFromSvg(input)).toBe(expected)
  })
})

describe('getOutputSetting', () => {
  it.each([
    ['scale-1', { kind: 'scale', value: 1 }],
    ['scale-2', { kind: 'scale', value: 2 }],
    ['scale-4', { kind: 'scale', value: 4 }],
    ['width-1024', { kind: 'width', value: 1024 }],
  ])('maps %s', (id, expected) => {
    expect(getOutputSetting(id)).toEqual(expected)
  })

  it('falls back to the default (2×) for an unknown id', () => {
    expect(getOutputSetting('nope')).toEqual({ kind: 'scale', value: 2 })
  })

  it('falls back to the default for an empty id', () => {
    expect(getOutputSetting('')).toEqual({ kind: 'scale', value: 2 })
  })

  it('has unique ids and only positive values', () => {
    const ids = OUTPUT_OPTIONS.map((option) => option.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(OUTPUT_OPTIONS.every((option) => option.setting.value > 0)).toBe(true)
  })
})

describe('calculateOutputSize', () => {
  const ok = (width: number, height: number) => ({ status: 'ok', width, height })

  it.each([
    [100, 50, 1, 100, 50],
    [100, 50, 2, 200, 100],
    [100, 50, 3, 300, 150],
  ])('scales %d × %d by %d×', (width, height, scale, expectedWidth, expectedHeight) => {
    expect(calculateOutputSize({ width, height }, { kind: 'scale', value: scale })).toEqual(
      ok(expectedWidth, expectedHeight),
    )
  })

  it.each([
    [100, 50, 400, 400, 200],
    [24, 24, 1024, 1024, 1024],
    [300, 150, 600, 600, 300],
    [1920, 1080, 1024, 1024, 576],
  ])('fits %d × %d to a width of %d px', (width, height, target, expectedWidth, expectedHeight) => {
    expect(calculateOutputSize({ width, height }, { kind: 'width', value: target })).toEqual(
      ok(expectedWidth, expectedHeight),
    )
  })

  it('rounds to whole pixels', () => {
    expect(calculateOutputSize({ width: 100, height: 33 }, { kind: 'scale', value: 2 })).toEqual(ok(200, 66))
    expect(calculateOutputSize({ width: 3, height: 2 }, { kind: 'width', value: 10 })).toEqual(ok(10, 7))
    expect(calculateOutputSize({ width: 24.5, height: 12.25 }, { kind: 'scale', value: 2 })).toEqual(ok(49, 25))
  })

  it('never produces a side smaller than 1 px', () => {
    expect(calculateOutputSize({ width: 1000, height: 1 }, { kind: 'width', value: 100 })).toEqual(ok(100, 1))
  })

  it('keeps the aspect ratio of the SVG', () => {
    for (const [width, height] of [
      [1920, 1080],
      [24, 24],
      [300, 150],
      [1600, 900],
    ] as const) {
      const result = calculateOutputSize({ width, height }, { kind: 'width', value: 2048 })
      expect(result.status).toBe('ok')
      if (result.status === 'ok') {
        expect(result.width / result.height).toBeCloseTo(width / height, 2)
      }
    }
  })

  it('accepts the largest allowed sizes', () => {
    // 7071² = 49 999 041 pixels, just under the 50 megapixel limit.
    expect(calculateOutputSize({ width: 7071, height: 7071 }, { kind: 'scale', value: 1 })).toEqual(ok(7071, 7071))
    expect(calculateOutputSize({ width: 16384, height: 1 }, { kind: 'scale', value: 1 })).toEqual(ok(16384, 1))
  })

  it.each([
    [7072, 7072, { kind: 'scale', value: 1 }],
    [16385, 1, { kind: 'scale', value: 1 }],
    [100, 100, { kind: 'width', value: 16385 }],
    [10000, 10000, { kind: 'scale', value: 1 }],
    [1e300, 1e300, { kind: 'scale', value: 1 }],
    [1, 100000, { kind: 'width', value: 4096 }],
  ] as const)('refuses %d × %d with %j (over the limits)', (width, height, setting) => {
    expect(calculateOutputSize({ width, height }, setting)).toEqual({ status: 'error', code: 'outputTooLarge' })
  })

  it.each([
    [0, 10],
    [10, 0],
    [-1, 10],
    [NaN, 10],
    [10, Infinity],
  ])('rejects the invalid SVG size %d × %d', (width, height) => {
    expect(calculateOutputSize({ width, height }, { kind: 'scale', value: 2 })).toEqual({
      status: 'error',
      code: 'invalidSize',
    })
  })

  it.each([0, -1, NaN, Infinity])('rejects the invalid setting value %d', (value) => {
    expect(calculateOutputSize({ width: 10, height: 10 }, { kind: 'scale', value })).toEqual({
      status: 'error',
      code: 'invalidSize',
    })
  })
})

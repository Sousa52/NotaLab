import { describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE_BYTES } from '../jpg-to-png/convert'
import {
  BACKGROUND_COLOR,
  DEFAULT_RESOLUTION_ID,
  JPEG_QUALITY,
  MAX_PDF_PAGES,
  MAX_RENDER_PIXELS,
  MAX_RENDER_SIDE,
  PDF_HEADER_BYTES,
  RESOLUTION_OPTIONS,
  calculateRenderScale,
  classifyOpenError,
  getPageFileName,
  getPdfBaseName,
  getResolution,
  getZipFileName,
  hasPdfExtension,
  hasPdfHeader,
  validatePageCount,
  validatePdfFile,
} from './convert'

// Pure helpers only: no PDF.js, no Canvas, no DOM — these run in a plain Node environment.

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

describe('constants', () => {
  it('uses the agreed limits and output settings', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024)
    expect(MAX_PDF_PAGES).toBe(50)
    expect(JPEG_QUALITY).toBe(0.92)
    expect(BACKGROUND_COLOR).toBe('#ffffff')
  })

  it('keeps a rendered page within what Safari on iOS can draw', () => {
    expect(MAX_RENDER_PIXELS).toBeLessThanOrEqual(16_777_216)
    expect(MAX_RENDER_SIDE).toBeLessThanOrEqual(16_384)
  })
})

describe('resolutions', () => {
  it('offers 100, 150 and 200 DPI, with 150 as the default', () => {
    expect(RESOLUTION_OPTIONS.map((option) => option.dpi)).toEqual([100, 150, 200])
    expect(getResolution(DEFAULT_RESOLUTION_ID).dpi).toBe(150)
  })

  it('finds a resolution by id', () => {
    expect(getResolution('low')).toEqual({ id: 'low', dpi: 100 })
    expect(getResolution('high')).toEqual({ id: 'high', dpi: 200 })
  })

  it('falls back to the default for an unknown id', () => {
    expect(getResolution('ultra')).toEqual({ id: 'normal', dpi: 150 })
    expect(getResolution('')).toEqual({ id: 'normal', dpi: 150 })
  })
})

describe('validatePdfFile', () => {
  const ok = { status: 'ok' }

  describe('accepted files', () => {
    it.each([
      ['document.pdf', 'application/pdf'],
      ['document.pdf', 'application/x-pdf'],
      ['document.pdf', 'Application/PDF'],
      ['document.dat', 'application/pdf'],
    ])('accepts %s (%s)', (name, type) => {
      expect(validatePdfFile({ name, type, size: 1024 })).toEqual(ok)
    })

    it.each(['document.pdf', 'document.PDF', 'Relatório Final.Pdf'])('accepts an untyped file named %s', (name) => {
      expect(validatePdfFile({ name, type: '', size: 1024 })).toEqual(ok)
    })
  })

  describe('invalid formats', () => {
    it.each([
      ['a.png', 'image/png'],
      ['a.jpg', 'image/jpeg'],
      ['a.txt', 'text/plain'],
      ['a.zip', 'application/zip'],
      ['a.doc', 'application/msword'],
      ['a.pdf', 'text/plain'],
      ['a.pdf', 'image/png'],
    ])('rejects %s (%s) as not a PDF', (name, type) => {
      expect(validatePdfFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notPdf' })
    })

    it.each(['a.txt', 'readme', 'pdf', 'a.pdfx', 'a.pdf.exe'])('rejects an untyped file named %s', (name) => {
      expect(validatePdfFile({ name, type: '', size: 1024 })).toEqual({ status: 'error', code: 'notPdf' })
    })

    it('reports the wrong format before an empty or oversized file', () => {
      expect(validatePdfFile({ name: 'a.png', type: 'image/png', size: 0 })).toEqual({
        status: 'error',
        code: 'notPdf',
      })
      expect(validatePdfFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
        status: 'error',
        code: 'notPdf',
      })
    })
  })

  describe('empty files', () => {
    it.each([0, -1])('rejects a size of %d as empty', (size) => {
      expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size })).toEqual({
        status: 'error',
        code: 'empty',
      })
    })

    it('rejects an empty untyped .pdf file', () => {
      expect(validatePdfFile({ name: 'a.pdf', type: '', size: 0 })).toEqual({ status: 'error', code: 'empty' })
    })

    it('accepts a one-byte file (its content is checked later)', () => {
      expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: 1 })).toEqual(ok)
    })
  })

  describe('20 MB limit', () => {
    it('accepts a file of exactly 20 MB', () => {
      expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_FILE_SIZE_BYTES })).toEqual(ok)
    })

    it('rejects a file above 20 MB', () => {
      expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
        status: 'error',
        code: 'tooLarge',
      })
    })

    it('applies the limit to untyped files named .pdf', () => {
      expect(validatePdfFile({ name: 'a.pdf', type: '', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
        status: 'error',
        code: 'tooLarge',
      })
    })
  })
})

describe('hasPdfExtension', () => {
  it('matches .pdf in any case, ignoring surrounding spaces', () => {
    expect(hasPdfExtension('a.pdf')).toBe(true)
    expect(hasPdfExtension('A.PDF')).toBe(true)
    expect(hasPdfExtension('  a.pdf  ')).toBe(true)
  })

  it('does not match other names', () => {
    expect(hasPdfExtension('a.pdfx')).toBe(false)
    expect(hasPdfExtension('pdf')).toBe(false)
    expect(hasPdfExtension('a.pdf.txt')).toBe(false)
  })
})

describe('hasPdfHeader', () => {
  const SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"
  const bytesWithSignatureAt = (offset: number, length = PDF_HEADER_BYTES + 100) => {
    const bytes = new Uint8Array(length).fill(0x20)
    bytes.set(SIGNATURE, offset)
    return bytes
  }
  const text = (value: string) => new TextEncoder().encode(value)

  it('recognises a PDF header', () => {
    expect(hasPdfHeader(text('%PDF-1.7\n%âãÏÓ'))).toBe(true)
  })

  it('tolerates a few bytes of junk before the header', () => {
    expect(hasPdfHeader(bytesWithSignatureAt(10))).toBe(true)
  })

  it('finds the header as late as the last position inside the first 1024 bytes', () => {
    expect(hasPdfHeader(bytesWithSignatureAt(PDF_HEADER_BYTES - SIGNATURE.length))).toBe(true)
  })

  it('does not look for the header beyond the first 1024 bytes', () => {
    expect(hasPdfHeader(bytesWithSignatureAt(PDF_HEADER_BYTES - SIGNATURE.length + 1))).toBe(false)
    expect(hasPdfHeader(bytesWithSignatureAt(PDF_HEADER_BYTES + 10))).toBe(false)
  })

  it.each([
    ['an empty file', new Uint8Array(0)],
    ['plain text', text('hello world, this is not a PDF')],
    ['a truncated signature', text('%PDF')],
    ['a lower-case signature', text('%pdf-1.7')],
    ['a PNG', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
    ['a ZIP', new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])],
  ])('rejects %s', (_label, bytes) => {
    expect(hasPdfHeader(bytes)).toBe(false)
  })
})

describe('validatePageCount', () => {
  it.each([1, 2, 49, 50])('accepts %d pages', (count) => {
    expect(validatePageCount(count)).toEqual({ status: 'ok' })
  })

  it('rejects more than 50 pages', () => {
    expect(validatePageCount(51)).toEqual({ status: 'error', code: 'tooManyPages' })
    expect(validatePageCount(1000)).toEqual({ status: 'error', code: 'tooManyPages' })
  })

  it.each([0, -1, 1.5, NaN, Infinity])('rejects %d as having no usable pages', (count) => {
    expect(validatePageCount(count)).toEqual({ status: 'error', code: 'noPages' })
  })
})

describe('getPdfBaseName', () => {
  it.each([
    ['documento.pdf', 'documento'],
    ['Relatório Final.PDF', 'Relatório Final'],
    ['a.b.pdf', 'a.b'],
    ['notes', 'notes'],
    ['  spaced.pdf  ', 'spaced'],
    ['a   b.pdf', 'a b'],
  ])('turns %j into %j', (name, expected) => {
    expect(getPdfBaseName(name)).toBe(expected)
  })

  it.each(['', '   ', '.pdf', '...pdf', '. .pdf'])('uses "documento" for %j', (name) => {
    expect(getPdfBaseName(name)).toBe('documento')
  })

  it('replaces characters Windows does not allow in file names', () => {
    expect(getPdfBaseName('a/b\\c:d*e?f"g<h>i|j.pdf')).toBe('a-b-c-d-e-f-g-h-i-j')
  })

  it('replaces control characters', () => {
    expect(getPdfBaseName('a\u0001b\tc.pdf')).toBe('a-b-c')
  })

  it('removes leading and trailing dots', () => {
    expect(getPdfBaseName('...hidden.pdf')).toBe('hidden')
    expect(getPdfBaseName('name..pdf')).toBe('name')
    expect(getPdfBaseName('name .pdf')).toBe('name')
  })

  it('cuts very long names to 100 characters', () => {
    expect(getPdfBaseName(`${'a'.repeat(150)}.pdf`)).toBe('a'.repeat(100))
    expect(getPdfBaseName(`${'x'.repeat(99)} ${'y'.repeat(10)}.pdf`)).toBe('x'.repeat(99))
  })

  it('counts characters, not UTF-16 units, when cutting', () => {
    const result = getPdfBaseName(`${'😀'.repeat(150)}.pdf`)
    expect(Array.from(result)).toHaveLength(100)
    expect(result).toBe('😀'.repeat(100))
  })
})

describe('getPageFileName', () => {
  it('names a page after the PDF and the page number', () => {
    expect(getPageFileName('documento.pdf', 1)).toBe('documento-pagina-1.jpg')
    expect(getPageFileName('documento.pdf', 12)).toBe('documento-pagina-12.jpg')
  })

  it('keeps the name readable, accents and spaces included', () => {
    expect(getPageFileName('Relatório Final.PDF', 3)).toBe('Relatório Final-pagina-3.jpg')
  })

  it('makes the PDF name safe for a file name', () => {
    expect(getPageFileName('a/b:c.pdf', 2)).toBe('a-b-c-pagina-2.jpg')
  })

  it('falls back to "documento" when the PDF has no usable name', () => {
    expect(getPageFileName('.pdf', 1)).toBe('documento-pagina-1.jpg')
  })

  it('gives every page of a PDF a different name', () => {
    const names = Array.from({ length: MAX_PDF_PAGES }, (_, index) => getPageFileName('x.pdf', index + 1))
    expect(new Set(names).size).toBe(MAX_PDF_PAGES)
  })
})

describe('getZipFileName', () => {
  it('names the archive after the PDF', () => {
    expect(getZipFileName('documento.pdf')).toBe('documento-jpg.zip')
    expect(getZipFileName('Relatório Final.PDF')).toBe('Relatório Final-jpg.zip')
    expect(getZipFileName('')).toBe('documento-jpg.zip')
  })
})

describe('calculateRenderScale', () => {
  it.each([
    [100, 1.3888888888888888, 826, 1169],
    [150, 2.0833333333333335, 1240, 1753],
    [200, 2.7777777777777777, 1653, 2338],
  ])('renders an A4 page at %d DPI', (dpi, scale, width, height) => {
    const size = calculateRenderScale(A4_WIDTH, A4_HEIGHT, dpi)
    expect(size).not.toBeNull()
    expect(size?.scale).toBeCloseTo(scale, 10)
    expect(size).toMatchObject({ width, height, reduced: false })
  })

  it('renders a landscape page by swapping the sides', () => {
    expect(calculateRenderScale(A4_HEIGHT, A4_WIDTH, 150)).toMatchObject({ width: 1753, height: 1240 })
  })

  it('reduces a page that would exceed the pixel limit, keeping its aspect ratio', () => {
    // A0 poster: 150 DPI would need almost 35 megapixels.
    const size = calculateRenderScale(2384, 3370, 150)
    expect(size).toMatchObject({ width: 3364, height: 4755, reduced: true })
    expect((size?.width ?? 0) * (size?.height ?? 0)).toBeLessThanOrEqual(MAX_RENDER_PIXELS)
    expect((size?.width ?? 0) / (size?.height ?? 1)).toBeCloseTo(2384 / 3370, 2)
  })

  it('reduces a very long page to the side limit', () => {
    const size = calculateRenderScale(100, 20000, 150)
    expect(size?.reduced).toBe(true)
    expect(size?.width).toBe(40)
    expect(size?.height).toBeLessThanOrEqual(MAX_RENDER_SIDE)
    expect(size?.height).toBeGreaterThanOrEqual(MAX_RENDER_SIDE - 1)
  })

  it('never goes below one pixel per side', () => {
    expect(calculateRenderScale(1, 1, 100)).toMatchObject({ width: 1, height: 1 })
    expect(calculateRenderScale(0.4, 0.4, 72)).toMatchObject({ width: 1, height: 1 })
  })

  it.each([
    [0, 100, 150],
    [100, 0, 150],
    [-1, 100, 150],
    [100, -1, 150],
    [NaN, 100, 150],
    [100, Infinity, 150],
    [100, 100, 0],
    [100, 100, -72],
    [100, 100, NaN],
  ])('returns null for page %d × %d at %d DPI', (width, height, dpi) => {
    expect(calculateRenderScale(width, height, dpi)).toBeNull()
  })
})

describe('classifyOpenError', () => {
  it('recognises a password-protected PDF', () => {
    expect(classifyOpenError(Object.assign(new Error('No password given'), { name: 'PasswordException' }))).toBe(
      'encrypted',
    )
  })

  it.each(['InvalidPDFException', 'FormatError', 'MissingPDFException'])('treats %s as an invalid PDF', (name) => {
    expect(classifyOpenError(Object.assign(new Error('bad'), { name }))).toBe('invalidPdf')
  })

  it('reads the name from plain objects too (errors rebuilt from the worker)', () => {
    expect(classifyOpenError({ name: 'PasswordException', message: 'x' })).toBe('encrypted')
    expect(classifyOpenError({ name: 'InvalidPDFException' })).toBe('invalidPdf')
  })

  it('reports anything else as a generic failure', () => {
    expect(classifyOpenError(new Error('boom'))).toBe('loadFailed')
    expect(classifyOpenError(Object.assign(new Error('x'), { name: 'UnknownErrorException' }))).toBe('loadFailed')
    expect(classifyOpenError(Object.assign(new Error('x'), { name: 'ResponseException' }))).toBe('loadFailed')
  })

  it.each([null, undefined, 'PasswordException', 42, {}, { name: 123 }])('copes with %j', (error) => {
    expect(classifyOpenError(error)).toBe('loadFailed')
  })
})

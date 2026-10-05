import { describe, expect, it } from 'vitest'
import { analyzeGif, hasGifSignature } from './gif'

// Pure byte inspection: tiny synthetic GIFs are built here, so no browser or image decoding is
// needed. Only the block structure matters to `analyzeGif`; the image data is never decoded.

const ascii = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0))

/** A two-color global color table. */
const COLOR_TABLE = [0, 0, 0, 255, 255, 255]

/** Header + logical screen descriptor (+ global color table). */
function head(options: { version?: string; globalColors?: boolean } = {}): number[] {
  const { version = 'GIF89a', globalColors = true } = options
  return [...ascii(version), 2, 0, 2, 0, globalColors ? 0x80 : 0x00, 0, 0, ...(globalColors ? COLOR_TABLE : [])]
}

/** One image block: descriptor, optional local color table, LZW code size and one data sub-block. */
function frame(localColors = false): number[] {
  return [
    0x2c,
    0, 0, 0, 0,
    2, 0, 2, 0,
    localColors ? 0x80 : 0x00,
    ...(localColors ? COLOR_TABLE : []),
    0x02,
    0x02, 0x44, 0x01,
    0x00,
  ]
}

const graphicControl = [0x21, 0xf9, 0x04, 0x01, 0x0a, 0x00, 0x00, 0x00]
const loopExtension = [0x21, 0xff, 0x0b, ...ascii('NETSCAPE2.0'), 0x03, 0x01, 0x00, 0x00, 0x00]
const commentExtension = [0x21, 0xfe, 0x03, ...ascii('abc'), 0x00]
const TRAILER = [0x3b]

function gif(...parts: number[][]): Uint8Array {
  return new Uint8Array(parts.flat())
}

describe('hasGifSignature', () => {
  it.each<[string, boolean]>([
    ['GIF89a', true],
    ['GIF87a', true],
    ['GIF88a', false],
    ['gif89a', false],
    ['', false],
    ['GIF89', false],
    ['hello world', false],
  ])('%j → %s', (text, expected) => {
    expect(hasGifSignature(new Uint8Array(ascii(text)))).toBe(expected)
  })

  it('ignores whatever follows the header', () => {
    expect(hasGifSignature(new Uint8Array([...ascii('GIF89a'), 1, 2, 3]))).toBe(true)
  })

  it('rejects a PNG signature', () => {
    expect(hasGifSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(false)
  })
})

describe('analyzeGif', () => {
  it('reports a still GIF as one frame, not animated', () => {
    expect(analyzeGif(gif(head(), frame(), TRAILER))).toEqual({ valid: true, frames: 1, animated: false })
  })

  it('reports two or more frames as animated, skipping loop and graphic-control extensions', () => {
    expect(analyzeGif(gif(head(), loopExtension, graphicControl, frame(), graphicControl, frame(), TRAILER))).toEqual({
      valid: true,
      frames: 2,
      animated: true,
    })
  })

  it('counts every frame', () => {
    const bytes = gif(head(), frame(), frame(), frame(), TRAILER)
    expect(analyzeGif(bytes)).toEqual({ valid: true, frames: 3, animated: true })
  })

  it('handles a GIF with no global color table', () => {
    expect(analyzeGif(gif(head({ globalColors: false }), frame(), TRAILER))).toEqual({
      valid: true,
      frames: 1,
      animated: false,
    })
  })

  it('skips local color tables and keeps counting', () => {
    expect(analyzeGif(gif(head(), frame(true), frame(true), TRAILER)).frames).toBe(2)
  })

  it('does not count a comment extension as a frame', () => {
    expect(analyzeGif(gif(head(), commentExtension, frame(), TRAILER)).frames).toBe(1)
  })

  it('accepts the older GIF87a header', () => {
    expect(analyzeGif(gif(head({ version: 'GIF87a' }), frame(), TRAILER))).toEqual({
      valid: true,
      frames: 1,
      animated: false,
    })
  })

  it('rejects bytes that are not a GIF', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0])
    expect(analyzeGif(png)).toEqual({ valid: false, frames: 0, animated: false })
  })

  it('rejects a header with no screen descriptor', () => {
    expect(analyzeGif(new Uint8Array(ascii('GIF89a')))).toEqual({ valid: false, frames: 0, animated: false })
  })

  it('rejects empty input', () => {
    expect(analyzeGif(new Uint8Array())).toEqual({ valid: false, frames: 0, animated: false })
  })

  it('survives a file cut in the middle of the first frame', () => {
    expect(analyzeGif(gif(head(), [0x2c, 0, 0]))).toEqual({ valid: true, frames: 1, animated: false })
  })

  it('stops at an unknown block instead of guessing', () => {
    expect(analyzeGif(gif(head(), [0x99], frame(), TRAILER))).toEqual({ valid: true, frames: 0, animated: false })
  })

  it('does not run past the end when a sub-block claims a huge length', () => {
    expect(analyzeGif(gif(head(), [0x21, 0xff, 0xff, 1, 2, 3]))).toEqual({ valid: true, frames: 0, animated: false })
  })

  it('ignores anything after the trailer', () => {
    expect(analyzeGif(gif(head(), frame(), TRAILER, frame())).frames).toBe(1)
  })

  it('still counts a frame when the trailer is missing', () => {
    expect(analyzeGif(gif(head(), frame())).frames).toBe(1)
  })
})

describe('content that is not a GIF, whatever the file is called', () => {
  it.each<[string, number[]]>([
    ['HTML that mentions GIF89a', ascii('<html><body>GIF89a</body></html>')],
    ['a JPEG', [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]],
    ['plain text', ascii('hello world, this is just text')],
    ['a GIF header preceded by a space', ascii(' GIF89a......')],
    ['an SVG', ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
  ])('rejects %s', (_label, content) => {
    expect(analyzeGif(new Uint8Array(content))).toEqual({ valid: false, frames: 0, animated: false })
  })

  it('accepts real GIF bytes, since only the content decides (not a MIME type or a name)', () => {
    expect(analyzeGif(gif(head(), frame(), TRAILER)).valid).toBe(true)
  })
})

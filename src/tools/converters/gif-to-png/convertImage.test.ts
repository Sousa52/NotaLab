import { describe, expect, it } from 'vitest'
import { convertGifToPng } from './convertImage'

// Only the paths that finish BEFORE any decoding are tested here: they inspect the file's
// bytes and return an error without touching createImageBitmap or Canvas, so they run in a
// plain Node environment. The decode → canvas → PNG step is the shared pipeline from the
// JPG → PNG converter and needs a real browser.

const ascii = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0))

/** A blob whose bytes cannot be read, to exercise the "could not read the file" path. */
class UnreadableBlob extends Blob {
  override arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.reject(new Error('unreadable'))
  }
}

describe('convertGifToPng — validates the content before converting', () => {
  it.each<[string, number[]]>([
    ['a PNG', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0]],
    ['HTML', ascii('<html><body>not an image</body></html>')],
    ['an empty file', []],
    ['a truncated header', ascii('GIF89a')],
  ])('refuses %s as an invalid GIF, whatever it is called', async (_label, bytes) => {
    const file = new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
    expect(await convertGifToPng(file)).toEqual({ status: 'error', code: 'invalidGif' })
  })

  it('reports a file that cannot be read as a decode failure', async () => {
    expect(await convertGifToPng(new UnreadableBlob([new Uint8Array([1, 2, 3])]))).toEqual({
      status: 'error',
      code: 'decodeFailed',
    })
  })
})

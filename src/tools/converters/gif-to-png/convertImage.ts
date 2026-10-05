// Browser-only conversion for GIF → PNG. The decode → canvas → PNG pipeline in the JPG → PNG
// converter does not depend on the input format: `createImageBitmap` decodes by content (for a
// GIF it yields the first frame), the canvas starts fully transparent and `toBlob` writes a PNG
// with its alpha channel. So that function is reused as is instead of being copied; this file
// only adds the GIF-specific part: confirming from the bytes that the file really is a GIF, and
// counting its frames so animated GIFs can be flagged. Needs a real browser (Canvas), so it is
// not covered by Vitest; the pure parts are in `gif.ts` and `convert.ts`.
//
// An animated GIF is converted as its first frame only; the PNG is a still image.

import { convertJpegToPng, type ConvertErrorCode } from '../jpg-to-png/convertImage'
import { analyzeGif, type GifInfo } from './gif'

export type GifConvertErrorCode = ConvertErrorCode | 'invalidGif'

export type GifConvertResult =
  | {
      status: 'ok'
      blob: Blob
      width: number
      height: number
      /** The GIF has more than one frame; only the first one was converted. */
      animated: boolean
      /** Number of frames found in the GIF. */
      frames: number
    }
  | { status: 'error'; code: GifConvertErrorCode }

/** Reads the file's bytes just long enough to inspect them; they are released on return. */
async function readGifInfo(file: Blob): Promise<GifInfo | null> {
  try {
    return analyzeGif(new Uint8Array(await file.arrayBuffer()))
  } catch {
    return null
  }
}

/**
 * Converts one GIF image to PNG at its original dimensions, preserving transparency where the
 * browser's GIF decoding allows it. Animated GIFs produce their first frame only.
 *
 * Never throws: unreadable files, content that is not a GIF, decoding problems and conversion
 * problems all come back as an error result.
 */
export async function convertGifToPng(file: Blob): Promise<GifConvertResult> {
  const info = await readGifInfo(file)
  if (!info) return { status: 'error', code: 'decodeFailed' }
  if (!info.valid) return { status: 'error', code: 'invalidGif' }

  const result = await convertJpegToPng(file)
  if (result.status === 'error') return result

  return { ...result, animated: info.animated, frames: info.frames }
}

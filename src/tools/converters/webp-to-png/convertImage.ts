// Browser-only conversion for WebP → PNG. The decode → canvas → PNG pipeline in the JPG → PNG
// converter does not depend on the input format: `createImageBitmap` decodes by content, the
// canvas starts fully transparent (nothing is painted behind the image) and `toBlob` writes a
// PNG with its alpha channel. So WebP transparency and the original dimensions are kept, and
// that function is reused as is instead of being copied. Needs a real browser (Canvas), so it
// is not covered by Vitest; the pure helpers are in `convert.ts`.
//
// An animated WebP is converted as its first frame only.

import { convertJpegToPng } from '../jpg-to-png/convertImage'

/**
 * Converts one WebP image to PNG at its original dimensions, preserving transparency.
 * Never throws: decoding and conversion problems (including a browser that cannot decode
 * WebP) come back as an error result.
 */
export const convertWebpToPng = convertJpegToPng

// Pure GIF inspection — no React, no DOM. Reads the GIF block structure from raw bytes to
// (1) confirm the file really is a GIF, whatever its name or MIME type says, and (2) count its
// frames, so the UI can tell the user when an animated GIF was converted as its first frame
// only. The image data itself is never decoded here; the browser does that.

export interface GifInfo {
  /** The bytes start with a GIF signature and a complete header. */
  valid: boolean
  /** Number of image frames found. */
  frames: number
  /** More than one frame. */
  animated: boolean
}

const HEADER_LENGTH = 6
const SCREEN_DESCRIPTOR_END = 13
const EXTENSION_INTRODUCER = 0x21
const IMAGE_SEPARATOR = 0x2c
const TRAILER = 0x3b

/** True when the bytes start with "GIF87a" or "GIF89a" (case-sensitive, as in the format). */
export function hasGifSignature(bytes: Uint8Array): boolean {
  if (bytes.length < HEADER_LENGTH) return false
  const header = String.fromCharCode(...bytes.subarray(0, HEADER_LENGTH))
  return header === 'GIF87a' || header === 'GIF89a'
}

/** Size in bytes of a color table whose size field (low 3 bits of `packed`) is given. */
function colorTableBytes(packed: number): number {
  return 3 * (1 << ((packed & 0x07) + 1))
}

/** Skips a chain of data sub-blocks (length byte + data, ended by a zero length). */
function skipSubBlocks(bytes: Uint8Array, start: number): number {
  let position = start
  while (position < bytes.length) {
    const size = bytes[position]
    position += 1
    if (size === 0) return position
    position += size
  }
  return position
}

/**
 * Walks the GIF blocks and counts the frames. Tolerant of damaged files: it stops at the
 * trailer, at an unknown block, or at the end of the data, and never throws or loops forever.
 */
export function analyzeGif(bytes: Uint8Array): GifInfo {
  if (!hasGifSignature(bytes) || bytes.length < SCREEN_DESCRIPTOR_END) {
    return { valid: false, frames: 0, animated: false }
  }

  // Logical screen descriptor: width, height, packed flags (bit 7 = global color table).
  const screenFlags = bytes[10] ?? 0
  let position = SCREEN_DESCRIPTOR_END
  if (screenFlags & 0x80) position += colorTableBytes(screenFlags)

  let frames = 0
  while (position < bytes.length) {
    const block = bytes[position]

    if (block === TRAILER) break

    if (block === EXTENSION_INTRODUCER) {
      // Introducer, label, then data sub-blocks (graphic control, comment, application…).
      position = skipSubBlocks(bytes, position + 2)
    } else if (block === IMAGE_SEPARATOR) {
      frames += 1
      // Separator + left, top, width, height (2 bytes each) + packed flags = 10 bytes.
      if (position + 10 > bytes.length) break
      const imageFlags = bytes[position + 9] ?? 0
      position += 10
      if (imageFlags & 0x80) position += colorTableBytes(imageFlags)
      // LZW minimum code size, then the image data sub-blocks.
      position = skipSubBlocks(bytes, position + 1)
    } else {
      break
    }
  }

  return { valid: true, frames, animated: frames > 1 }
}

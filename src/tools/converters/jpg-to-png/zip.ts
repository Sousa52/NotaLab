// Minimal ZIP writer (method 0 = "stored", no compression) so "download all" works without a
// dependency. PNG files are already compressed, so storing them loses nothing.
//
// The archive is returned as a list of parts (small header arrays interleaved with the
// original data) to pass to `new Blob(parts)`. The image data is never copied into one big
// buffer. Limits of the classic ZIP format apply: at most 65 535 entries, and 4 GiB in total.

export interface ZipEntry {
  /** File name inside the archive (stored as UTF-8). */
  name: string
  data: Blob | Uint8Array<ArrayBuffer>
  /** CRC-32 of the data (see {@link crc32}). */
  crc32: number
}

export type ZipPart = Blob | Uint8Array<ArrayBuffer>

export const MAX_ZIP_ENTRIES = 0xffff
const MAX_ZIP_BYTES = 0xffffffff

const LOCAL_HEADER_SIGNATURE = 0x04034b50
const CENTRAL_HEADER_SIGNATURE = 0x02014b50
const END_SIGNATURE = 0x06054b50
const VERSION = 20
/** General-purpose flag bit 11: file names are UTF-8. */
const UTF8_FLAG = 0x0800

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

/** CRC-32 (IEEE 802.3), as used by ZIP. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** Encodes a date in the MS-DOS format used by ZIP (2-second resolution, local time, 1980+). */
export function toDosDateTime(date: Date): { time: number; date: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107)
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

function dataSize(data: Blob | Uint8Array): number {
  return data instanceof Blob ? data.size : data.length
}

/**
 * Builds a ZIP archive from the entries, in order.
 *
 * @throws RangeError when the archive would exceed the classic ZIP limits.
 */
export function buildZip(entries: readonly ZipEntry[], modified: Date = new Date()): ZipPart[] {
  if (entries.length > MAX_ZIP_ENTRIES) throw new RangeError('Too many files for a ZIP archive.')

  const encoder = new TextEncoder()
  const stamp = toDosDateTime(modified)
  const parts: ZipPart[] = []
  const centralHeaders: Uint8Array<ArrayBuffer>[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const size = dataSize(entry.data)
    if (size > MAX_ZIP_BYTES) throw new RangeError('A file is too large for a ZIP archive.')

    const local = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, LOCAL_HEADER_SIGNATURE, true)
    localView.setUint16(4, VERSION, true)
    localView.setUint16(6, UTF8_FLAG, true)
    localView.setUint16(8, 0, true) // method: stored
    localView.setUint16(10, stamp.time, true)
    localView.setUint16(12, stamp.date, true)
    localView.setUint32(14, entry.crc32, true)
    localView.setUint32(18, size, true) // compressed size
    localView.setUint32(22, size, true) // uncompressed size
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true) // extra field length
    local.set(nameBytes, 30)

    const central = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, CENTRAL_HEADER_SIGNATURE, true)
    centralView.setUint16(4, VERSION, true) // version made by
    centralView.setUint16(6, VERSION, true) // version needed
    centralView.setUint16(8, UTF8_FLAG, true)
    centralView.setUint16(10, 0, true) // method: stored
    centralView.setUint16(12, stamp.time, true)
    centralView.setUint16(14, stamp.date, true)
    centralView.setUint32(16, entry.crc32, true)
    centralView.setUint32(20, size, true)
    centralView.setUint32(24, size, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true) // extra field length
    centralView.setUint16(32, 0, true) // comment length
    centralView.setUint16(34, 0, true) // disk number start
    centralView.setUint16(36, 0, true) // internal attributes
    centralView.setUint32(38, 0, true) // external attributes
    centralView.setUint32(42, offset, true) // offset of the local header
    central.set(nameBytes, 46)

    parts.push(local, entry.data)
    centralHeaders.push(central)
    offset += local.length + size
    if (offset > MAX_ZIP_BYTES) throw new RangeError('The ZIP archive would be too large.')
  }

  const centralSize = centralHeaders.reduce((sum, header) => sum + header.length, 0)
  if (offset + centralSize > MAX_ZIP_BYTES) throw new RangeError('The ZIP archive would be too large.')

  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, END_SIGNATURE, true)
  endView.setUint16(4, 0, true) // this disk
  endView.setUint16(6, 0, true) // disk with the central directory
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true) // comment length

  parts.push(...centralHeaders, end)
  return parts
}

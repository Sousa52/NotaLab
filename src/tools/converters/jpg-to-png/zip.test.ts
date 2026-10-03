import { describe, expect, it } from 'vitest'
import { MAX_ZIP_ENTRIES, buildZip, crc32, toDosDateTime } from './zip'
import type { ZipEntry, ZipPart } from './zip'

// Pure byte-level tests: no DOM, no timezone dependence (dates are built from local fields).

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesOf(part: ZipPart | undefined): Uint8Array {
  if (!part || part instanceof Blob) throw new Error('Expected a byte part')
  return part
}

function toBytes(parts: ZipPart[]): Uint8Array {
  const arrays = parts.map((part) => bytesOf(part))
  const out = new Uint8Array(arrays.reduce((sum, array) => sum + array.length, 0))
  let offset = 0
  for (const array of arrays) {
    out.set(array, offset)
    offset += array.length
  }
  return out
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function entry(name: string, text: string): ZipEntry {
  const data = encoder.encode(text)
  return { name, data, crc32: crc32(data) }
}

function readEnd(bytes: Uint8Array) {
  const view = viewOf(bytes)
  const start = bytes.length - 22
  return {
    signature: view.getUint32(start, true),
    entriesOnDisk: view.getUint16(start + 8, true),
    entriesTotal: view.getUint16(start + 10, true),
    centralSize: view.getUint32(start + 12, true),
    centralOffset: view.getUint32(start + 16, true),
  }
}

describe('crc32', () => {
  it.each<[string, number]>([
    ['', 0x00000000],
    ['a', 0xe8b7be43],
    ['123456789', 0xcbf43926],
    ['The quick brown fox jumps over the lazy dog', 0x414fa339],
  ])('computes the CRC-32 of %j', (text, expected) => {
    expect(crc32(encoder.encode(text))).toBe(expected)
  })

  it('always returns an unsigned 32-bit integer', () => {
    const value = crc32(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x00, 0x80]))
    expect(Number.isInteger(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('toDosDateTime', () => {
  it('encodes a local date and time', () => {
    expect(toDosDateTime(new Date(2024, 4, 17, 13, 45, 30))).toEqual({
      time: (13 << 11) | (45 << 5) | 15,
      date: ((2024 - 1980) << 9) | (5 << 5) | 17,
    })
  })

  it('stores seconds with two-second resolution (rounded down)', () => {
    expect(toDosDateTime(new Date(2024, 0, 2, 3, 4, 31)).time & 0x1f).toBe(15)
  })

  it('clamps years before 1980 to 1980', () => {
    expect(toDosDateTime(new Date(1970, 0, 1, 0, 0, 0))).toEqual({ time: 0, date: (0 << 9) | (1 << 5) | 1 })
  })

  it('clamps years after 2107 to 2107', () => {
    expect(toDosDateTime(new Date(2200, 11, 31, 23, 59, 58)).date).toBe(((2107 - 1980) << 9) | (12 << 5) | 31)
  })
})

describe('buildZip', () => {
  const modified = new Date(2024, 4, 17, 13, 45, 30)

  it('returns a local header, the data, a central header and an end record for one file', () => {
    const file = entry('a.png', 'hello')
    const parts = buildZip([file], modified)
    expect(parts).toHaveLength(4)
    expect(bytesOf(parts[0]).length).toBe(30 + 5)
    expect(parts[1]).toBe(file.data)
    expect(bytesOf(parts[2]).length).toBe(46 + 5)
    expect(bytesOf(parts[3]).length).toBe(22)
  })

  it('writes a correct local file header', () => {
    const file = entry('a.png', 'hello')
    const header = bytesOf(buildZip([file], modified)[0])
    const view = viewOf(header)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint16(4, true)).toBe(20)
    expect(view.getUint16(6, true)).toBe(0x0800)
    expect(view.getUint16(8, true)).toBe(0)
    expect(view.getUint32(14, true)).toBe(file.crc32)
    expect(view.getUint32(18, true)).toBe(5)
    expect(view.getUint32(22, true)).toBe(5)
    expect(view.getUint16(26, true)).toBe(5)
    expect(view.getUint16(28, true)).toBe(0)
    expect(decoder.decode(header.slice(30))).toBe('a.png')
  })

  it('writes a correct central directory header', () => {
    const file = entry('a.png', 'hello')
    const header = bytesOf(buildZip([file], modified)[2])
    const view = viewOf(header)
    expect(view.getUint32(0, true)).toBe(0x02014b50)
    expect(view.getUint16(8, true)).toBe(0x0800)
    expect(view.getUint16(10, true)).toBe(0)
    expect(view.getUint32(16, true)).toBe(file.crc32)
    expect(view.getUint32(20, true)).toBe(5)
    expect(view.getUint32(24, true)).toBe(5)
    expect(view.getUint16(28, true)).toBe(5)
    expect(view.getUint32(42, true)).toBe(0)
    expect(decoder.decode(header.slice(46))).toBe('a.png')
  })

  it('writes a correct end-of-central-directory record', () => {
    const end = readEnd(toBytes(buildZip([entry('a.png', 'hello')], modified)))
    expect(end.signature).toBe(0x06054b50)
    expect(end.entriesOnDisk).toBe(1)
    expect(end.entriesTotal).toBe(1)
    expect(end.centralSize).toBe(46 + 5)
    expect(end.centralOffset).toBe(30 + 5 + 5)
  })

  it('records the right offsets and counts for several files', () => {
    const bytes = toBytes(buildZip([entry('a.png', 'hello'), entry('bb.png', 'world!')], modified))
    const view = viewOf(bytes)
    const end = readEnd(bytes)

    const secondLocalOffset = 30 + 5 + 5
    const centralOffset = secondLocalOffset + (30 + 6 + 6)
    expect(end.entriesTotal).toBe(2)
    expect(end.centralOffset).toBe(centralOffset)
    expect(end.centralSize).toBe(46 + 5 + (46 + 6))
    expect(bytes.length).toBe(centralOffset + end.centralSize + 22)

    const secondCentral = centralOffset + 46 + 5
    expect(view.getUint32(secondCentral, true)).toBe(0x02014b50)
    expect(view.getUint32(secondCentral + 42, true)).toBe(secondLocalOffset)
    expect(decoder.decode(bytes.slice(secondCentral + 46, secondCentral + 46 + 6))).toBe('bb.png')
  })

  it('lays the files out in order, each local header followed by its data', () => {
    const bytes = toBytes(buildZip([entry('a.png', 'hello'), entry('bb.png', 'world!')], modified))
    const view = viewOf(bytes)

    expect(decoder.decode(bytes.slice(30, 35))).toBe('a.png')
    expect(decoder.decode(bytes.slice(35, 40))).toBe('hello')

    expect(view.getUint32(40, true)).toBe(0x04034b50)
    expect(decoder.decode(bytes.slice(70, 76))).toBe('bb.png')
    expect(decoder.decode(bytes.slice(76, 82))).toBe('world!')
  })

  it('stores non-ASCII names as UTF-8 and sets the UTF-8 flag', () => {
    const name = 'fotografia-ação.png'
    const nameBytes = encoder.encode(name)
    const header = bytesOf(buildZip([entry(name, 'x')], modified)[0])
    const view = viewOf(header)
    expect(nameBytes.length).toBeGreaterThan(name.length)
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800)
    expect(view.getUint16(26, true)).toBe(nameBytes.length)
    expect(decoder.decode(header.slice(30))).toBe(name)
  })

  it('supports an empty file', () => {
    const file = entry('empty.png', '')
    const parts = buildZip([file], modified)
    const view = viewOf(bytesOf(parts[0]))
    expect(file.crc32).toBe(0)
    expect(bytesOf(parts[1]).length).toBe(0)
    expect(view.getUint32(18, true)).toBe(0)
    expect(view.getUint32(22, true)).toBe(0)
    const end = readEnd(toBytes(parts))
    expect(end.entriesTotal).toBe(1)
    expect(end.centralOffset).toBe(30 + 9)
  })

  it('builds a valid empty archive from no files', () => {
    const parts = buildZip([], modified)
    const bytes = toBytes(parts)
    expect(parts).toHaveLength(1)
    expect(bytes.length).toBe(22)
    expect(readEnd(bytes)).toEqual({
      signature: 0x06054b50,
      entriesOnDisk: 0,
      entriesTotal: 0,
      centralSize: 0,
      centralOffset: 0,
    })
  })

  it('uses a Blob as-is (not copied) and takes its size from the Blob', () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])])
    const parts = buildZip([{ name: 'x.png', data: blob, crc32: 123 }], modified)
    expect(parts[1]).toBe(blob)
    const view = viewOf(bytesOf(parts[0]))
    expect(view.getUint32(18, true)).toBe(3)
    expect(view.getUint32(22, true)).toBe(3)
    expect(view.getUint32(14, true)).toBe(123)
  })

  it('refuses more files than the ZIP format allows', () => {
    const sample = entry('a.png', 'x')
    const tooMany = new Array<ZipEntry>(MAX_ZIP_ENTRIES + 1).fill(sample)
    expect(() => buildZip(tooMany, modified)).toThrow(RangeError)
  })

  it('stamps the modification date in the local and central headers', () => {
    const stamp = toDosDateTime(modified)
    const parts = buildZip([entry('a.png', 'x')], modified)
    const local = viewOf(bytesOf(parts[0]))
    const central = viewOf(bytesOf(parts[2]))
    expect(local.getUint16(10, true)).toBe(stamp.time)
    expect(local.getUint16(12, true)).toBe(stamp.date)
    expect(central.getUint16(12, true)).toBe(stamp.time)
    expect(central.getUint16(14, true)).toBe(stamp.date)
  })
})

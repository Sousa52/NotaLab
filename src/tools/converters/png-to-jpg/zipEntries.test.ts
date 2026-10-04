import { describe, expect, it } from 'vitest'
import { buildZip, crc32 } from '../jpg-to-png/zip'
import { createZipEntries } from './zipEntries'

// ZIP behaviour of the PNG → JPG converter, in a plain Node environment (Blob is global there).

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function blobOf(text: string): Blob {
  return new Blob([encoder.encode(text)])
}

async function archiveBytes(files: { name: string; text: string }[]): Promise<Uint8Array> {
  const entries = await createZipEntries(files.map((file) => ({ name: file.name, blob: blobOf(file.text) })))
  const parts = buildZip(entries, new Date(2024, 4, 17, 13, 45, 30))
  return new Uint8Array(await new Blob(parts).arrayBuffer())
}

function readCentralNames(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = bytes.length - 22
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const names: string[] = []
  for (let i = 0; i < count; i += 1) {
    const nameLength = view.getUint16(offset + 28, true)
    names.push(decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength)))
    offset += 46 + nameLength
  }
  return names
}

describe('createZipEntries', () => {
  it('returns no entries for no files', async () => {
    expect(await createZipEntries([])).toEqual([])
  })

  it('keeps the order and passes each Blob through without copying it', async () => {
    const first = blobOf('hello')
    const second = blobOf('world!')
    const entries = await createZipEntries([
      { name: 'one.jpg', blob: first },
      { name: 'two.jpg', blob: second },
    ])
    expect(entries.map((entry) => entry.name)).toEqual(['one.jpg', 'two.jpg'])
    expect(entries[0]?.data).toBe(first)
    expect(entries[1]?.data).toBe(second)
  })

  it('numbers duplicate names, case-insensitively', async () => {
    const entries = await createZipEntries([
      { name: 'a.jpg', blob: blobOf('1') },
      { name: 'a.jpg', blob: blobOf('2') },
      { name: 'A.jpg', blob: blobOf('3') },
    ])
    expect(entries.map((entry) => entry.name)).toEqual(['a.jpg', 'a (2).jpg', 'A (3).jpg'])
  })

  it('computes the CRC-32 of each file', async () => {
    const [entry] = await createZipEntries([{ name: 'a.jpg', blob: blobOf('hello') }])
    expect(entry?.crc32).toBe(0x3610a686)
    expect(entry?.crc32).toBe(crc32(encoder.encode('hello')))
  })

  it('gives an empty file a CRC of 0', async () => {
    const [entry] = await createZipEntries([{ name: 'empty.jpg', blob: blobOf('') }])
    expect(entry?.crc32).toBe(0)
  })
})

describe('archives built from the entries', () => {
  it('contains every file, with the right counts, sizes and data', async () => {
    const bytes = await archiveBytes([
      { name: 'one.jpg', text: 'hello' },
      { name: 'two.jpg', text: 'world!' },
    ])
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const end = bytes.length - 22

    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)
    expect(bytes.length).toBe(30 + 7 + 5 + (30 + 7 + 6) + (46 + 7) + (46 + 7) + 22)

    // First file: local header, then its data.
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(decoder.decode(bytes.slice(30, 37))).toBe('one.jpg')
    expect(decoder.decode(bytes.slice(37, 42))).toBe('hello')
    // Second file starts right after the first one's data.
    expect(view.getUint32(42, true)).toBe(0x04034b50)
    expect(decoder.decode(bytes.slice(72, 79))).toBe('two.jpg')
    expect(decoder.decode(bytes.slice(79, 85))).toBe('world!')
  })

  it('lists unique names in the central directory when the inputs repeat', async () => {
    const bytes = await archiveBytes([
      { name: 'a.jpg', text: 'x' },
      { name: 'a.jpg', text: 'y' },
    ])
    expect(readCentralNames(bytes)).toEqual(['a.jpg', 'a (2).jpg'])
  })

  it('keeps non-ASCII names intact', async () => {
    const bytes = await archiveBytes([{ name: 'fotografia-ação.jpg', text: 'x' }])
    expect(readCentralNames(bytes)).toEqual(['fotografia-ação.jpg'])
  })
})

import { describe, expect, it } from 'vitest'
import { takeAvailableSlots } from '../images-to-pdf/convert'
import { MAX_FILES, MAX_FILE_SIZE_BYTES, validateJpegFile } from '../jpg-to-png/convert'
import { buildZip, crc32 } from '../jpg-to-png/zip'
import { createZipEntries } from '../png-to-jpg/zipEntries'
import { getWebpFileName } from './convert'

// Multi-file behaviour of the JPG → WebP converter, in a plain Node environment (Blob is global
// there): how the output names come out, what ends up in the ZIP, and the 50-file limit. It
// uses the same shared helpers as the tool, in the same order as the component.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function webpBlob(content: string): Blob {
  return new Blob([encoder.encode(content)], { type: 'image/webp' })
}

interface ZipFile {
  name: string
  crc: number
  data: Uint8Array
}

/** Packages like the component does: unique names, then a stored ZIP. */
async function zipOf(files: { sourceName: string; content: string }[]): Promise<Blob> {
  const entries = await createZipEntries(
    files.map((file) => ({ name: getWebpFileName(file.sourceName), blob: webpBlob(file.content) })),
  )
  return new Blob(buildZip(entries, new Date(2024, 4, 17, 13, 45, 30)), { type: 'application/zip' })
}

/** A small independent ZIP reader (stored entries only), used to check the generated archive. */
async function readZip(zip: Blob): Promise<ZipFile[]> {
  const bytes = new Uint8Array(await zip.arrayBuffer())
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = bytes.length - 22
  expect(view.getUint32(end, true)).toBe(0x06054b50)
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)

  const files: ZipFile[] = []
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50)
    const crc = view.getUint32(offset + 16, true)
    const size = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50)
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true)
    files.push({ name, crc, data: bytes.subarray(dataStart, dataStart + size) })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return files
}

describe('ZIP packaging of several converted images', () => {
  it('holds one .webp per image, in order, with the original bytes', async () => {
    const zip = await zipOf([
      { sourceName: 'a.jpg', content: 'first image' },
      { sourceName: 'b.jpeg', content: 'second' },
      { sourceName: 'C.JPG', content: 'third image!' },
    ])

    const files = await readZip(zip)

    expect(files.map((file) => file.name)).toEqual(['a.webp', 'b.webp', 'C.webp'])
    expect(files.map((file) => decoder.decode(file.data))).toEqual(['first image', 'second', 'third image!'])
  })

  it('stores a correct CRC-32 for every file', async () => {
    const files = await readZip(
      await zipOf([
        { sourceName: 'a.jpg', content: 'hello' },
        { sourceName: 'b.jpg', content: 'world!' },
      ]),
    )
    for (const file of files) expect(file.crc).toBe(crc32(file.data))
    expect(files[0]?.crc).toBe(0x3610a686)
  })

  it('numbers images that end up with the same WebP name (photo.jpg and photo.jpeg)', async () => {
    const files = await readZip(
      await zipOf([
        { sourceName: 'photo.jpg', content: '1' },
        { sourceName: 'photo.jpeg', content: '2' },
        { sourceName: 'PHOTO.JPG', content: '3' },
      ]),
    )
    expect(files.map((file) => file.name)).toEqual(['photo.webp', 'photo (2).webp', 'PHOTO (3).webp'])
    expect(files.map((file) => decoder.decode(file.data))).toEqual(['1', '2', '3'])
  })

  it('keeps non-ASCII names intact', async () => {
    const files = await readZip(await zipOf([{ sourceName: 'fotografia-ação.jpg', content: 'x' }]))
    expect(files.map((file) => file.name)).toEqual(['fotografia-ação.webp'])
  })

  it('is a ZIP file: right MIME type and signature', async () => {
    const zip = await zipOf([{ sourceName: 'a.jpg', content: 'x' }])
    expect(zip.type).toBe('application/zip')
    const header = new Uint8Array(await zip.slice(0, 4).arrayBuffer())
    expect(Array.from(header)).toEqual([0x50, 0x4b, 0x03, 0x04])
  })

  it('packages the maximum number of images', async () => {
    const files = await readZip(
      await zipOf(Array.from({ length: MAX_FILES }, (_, index) => ({ sourceName: `img${index + 1}.jpg`, content: 'x' }))),
    )
    expect(files).toHaveLength(MAX_FILES)
    expect(files[MAX_FILES - 1]?.name).toBe(`img${MAX_FILES}.webp`)
  })
})

describe('adding several files at once', () => {
  const jpgs = (count: number) => Array.from({ length: count }, (_, index) => `photo-${index + 1}.jpg`)

  it('accepts up to 50 images', () => {
    const { accepted, ignored } = takeAvailableSlots(jpgs(50), 0)
    expect(accepted).toHaveLength(50)
    expect(ignored).toBe(0)
  })

  it('leaves out everything beyond the 50th image, keeping the order', () => {
    const { accepted, ignored } = takeAvailableSlots(jpgs(53), 0)
    expect(accepted).toEqual(jpgs(50))
    expect(ignored).toBe(3)
  })

  it('counts the images already in the list', () => {
    const { accepted, ignored } = takeAvailableSlots(jpgs(10), 45)
    expect(accepted).toEqual(jpgs(5))
    expect(ignored).toBe(5)
  })

  it('validates each file on its own, so one bad file does not stop the others', () => {
    const batch = [
      { name: 'good.jpg', type: 'image/jpeg', size: 1000 },
      { name: 'picture.png', type: 'image/png', size: 1000 },
      { name: 'empty.jpg', type: 'image/jpeg', size: 0 },
      { name: 'huge.jpg', type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES + 1 },
      { name: 'also-good.jpeg', type: '', size: 2000 },
    ]

    const results = batch.map((file) => validateJpegFile(file))

    expect(results).toEqual([
      { status: 'ok' },
      { status: 'error', code: 'notJpeg' },
      { status: 'error', code: 'empty' },
      { status: 'error', code: 'tooLarge' },
      { status: 'ok' },
    ])
    expect(batch.filter((_, index) => results[index]?.status === 'ok').map((file) => getWebpFileName(file.name))).toEqual([
      'good.webp',
      'also-good.webp',
    ])
  })
})

// Turns converted files into ZIP entries: unique names plus the CRC-32 each entry needs.
// Kept out of the component so the behaviour can be unit-tested. Uses the ZIP writer and the
// unique-name helper shared with the JPG → PNG converter.

import { makeUniqueFileNames } from '../jpg-to-png/convert'
import { crc32, type ZipEntry } from '../jpg-to-png/zip'

export interface NamedBlob {
  name: string
  blob: Blob
}

/**
 * Builds ZIP entries in the given order. Duplicate names are numbered ("a.jpg", "a (2).jpg"),
 * case-insensitively. Only the CRC needs the bytes: they are read one file at a time and
 * dropped right after, while the Blob itself goes into the entry without being copied.
 */
export async function createZipEntries(files: readonly NamedBlob[]): Promise<ZipEntry[]> {
  const names = makeUniqueFileNames(files.map((file) => file.name))
  const entries: ZipEntry[] = []

  for (const [index, file] of files.entries()) {
    const bytes = new Uint8Array(await file.blob.arrayBuffer())
    entries.push({ name: names[index] ?? file.name, data: file.blob, crc32: crc32(bytes) })
  }

  return entries
}

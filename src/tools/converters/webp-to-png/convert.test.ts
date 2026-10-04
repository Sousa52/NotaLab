import { describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE_BYTES } from '../jpg-to-png/convert'
import { WEBP_MIME_TYPES, getPngFileNameFromWebp, hasWebpExtension, validateWebpFile } from './convert'

// Pure helpers only: no Canvas, no DOM — these run in a plain Node environment. Unique names,
// size formatting, dimensions and ZIP building are shared with the other converters and are
// already covered by their own tests.

describe('constants', () => {
  it('accepts the standard WebP MIME type', () => {
    expect([...WEBP_MIME_TYPES]).toEqual(['image/webp'])
  })
})

describe('hasWebpExtension', () => {
  it.each(['photo.webp', 'photo.WEBP', 'Photo.WebP', 'my.photo.webp', ' photo.webp '])('accepts %j', (name) => {
    expect(hasWebpExtension(name)).toBe(true)
  })

  it.each(['photo.png', 'photo.webp.png', 'photo', 'webp', 'photo.webpx', 'photo.jpg'])('rejects %j', (name) => {
    expect(hasWebpExtension(name)).toBe(false)
  })
})

describe('validateWebpFile', () => {
  const ok = { status: 'ok' }

  it('accepts a WebP file', () => {
    expect(validateWebpFile({ name: 'photo.webp', type: 'image/webp', size: 1024 })).toEqual(ok)
  })

  it('reads the MIME type case-insensitively', () => {
    expect(validateWebpFile({ name: 'photo.webp', type: 'IMAGE/WEBP', size: 1024 })).toEqual(ok)
  })

  it.each(['photo.webp', 'photo.WEBP'])('accepts an untyped file named %s', (name) => {
    expect(validateWebpFile({ name, type: '', size: 1024 })).toEqual(ok)
  })

  it('trusts a WebP MIME type over an unusual file name', () => {
    expect(validateWebpFile({ name: 'photo.png', type: 'image/webp', size: 1024 })).toEqual(ok)
  })

  it.each([
    ['image/png', 'a.png'],
    ['image/jpeg', 'a.jpg'],
    ['image/gif', 'a.gif'],
    ['application/pdf', 'a.pdf'],
    ['image/avif', 'a.avif'],
    ['image/png', 'a.webp'],
  ])('rejects %s (%s)', (type, name) => {
    expect(validateWebpFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notWebp' })
  })

  it.each([
    ['', 'a.png'],
    ['', 'readme'],
  ])('rejects an untyped file that is not named like a WebP (%j, %s)', (type, name) => {
    expect(validateWebpFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notWebp' })
  })

  it('rejects an empty file', () => {
    expect(validateWebpFile({ name: 'a.webp', type: 'image/webp', size: 0 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a negative size', () => {
    expect(validateWebpFile({ name: 'a.webp', type: 'image/webp', size: -1 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a file above the 20 MB limit', () => {
    expect(validateWebpFile({ name: 'a.webp', type: 'image/webp', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'tooLarge',
    })
  })

  it('accepts a file of exactly the maximum size', () => {
    expect(validateWebpFile({ name: 'a.webp', type: 'image/webp', size: MAX_FILE_SIZE_BYTES })).toEqual(ok)
  })

  it('accepts a one-byte file', () => {
    expect(validateWebpFile({ name: 'a.webp', type: 'image/webp', size: 1 })).toEqual(ok)
  })

  it('reports the wrong type before the size', () => {
    expect(validateWebpFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'notWebp',
    })
  })
})

describe('getPngFileNameFromWebp', () => {
  it.each([
    ['photo.webp', 'photo.png'],
    ['photo.WEBP', 'photo.png'],
    ['Photo.WebP', 'Photo.png'],
    ['my.photo.webp', 'my.photo.png'],
    ['holiday photo (1).webp', 'holiday photo (1).png'],
    ['imagem-ação.webp', 'imagem-ação.png'],
    ['noextension', 'noextension.png'],
    ['photo.png', 'photo.png'],
    ['photo.jpg', 'photo.jpg.png'],
    ['  spaced.webp  ', 'spaced.png'],
    ['.webp', 'imagem.png'],
    ['', 'imagem.png'],
    ['photo.webp.webp', 'photo.webp.png'],
  ])('%j → %j', (input, expected) => {
    expect(getPngFileNameFromWebp(input)).toBe(expected)
  })
})

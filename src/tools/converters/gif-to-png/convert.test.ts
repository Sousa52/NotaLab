import { describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE_BYTES } from '../jpg-to-png/convert'
import { GIF_MIME_TYPES, getPngFileNameFromGif, hasGifExtension, validateGifFile } from './convert'

// Pure helpers only: no Canvas, no DOM — these run in a plain Node environment. Unique names,
// size formatting, dimensions and ZIP building are shared with the other converters and are
// already covered by their own tests.

describe('constants', () => {
  it('accepts the standard GIF MIME type', () => {
    expect([...GIF_MIME_TYPES]).toEqual(['image/gif'])
  })
})

describe('hasGifExtension', () => {
  it.each(['photo.gif', 'photo.GIF', 'Photo.Gif', 'my.photo.gif', ' photo.gif '])('accepts %j', (name) => {
    expect(hasGifExtension(name)).toBe(true)
  })

  it.each(['photo.png', 'photo.gif.png', 'photo', 'gif', 'photo.gifx', 'photo.giff', 'photo.jpg'])(
    'rejects %j',
    (name) => {
      expect(hasGifExtension(name)).toBe(false)
    },
  )
})

describe('validateGifFile', () => {
  const ok = { status: 'ok' }

  it('accepts a GIF file', () => {
    expect(validateGifFile({ name: 'anim.gif', type: 'image/gif', size: 1024 })).toEqual(ok)
  })

  it('reads the MIME type case-insensitively', () => {
    expect(validateGifFile({ name: 'anim.gif', type: 'IMAGE/GIF', size: 1024 })).toEqual(ok)
  })

  it.each(['anim.gif', 'anim.GIF'])('accepts an untyped file named %s', (name) => {
    expect(validateGifFile({ name, type: '', size: 1024 })).toEqual(ok)
  })

  it('trusts a GIF MIME type over an unusual file name', () => {
    expect(validateGifFile({ name: 'anim.png', type: 'image/gif', size: 1024 })).toEqual(ok)
  })

  it.each([
    ['image/png', 'a.png'],
    ['image/jpeg', 'a.jpg'],
    ['image/webp', 'a.webp'],
    ['application/pdf', 'a.pdf'],
    ['video/mp4', 'a.mp4'],
    ['image/png', 'a.gif'],
  ])('rejects %s (%s)', (type, name) => {
    expect(validateGifFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notGif' })
  })

  it.each([
    ['', 'a.png'],
    ['', 'readme'],
  ])('rejects an untyped file that is not named like a GIF (%j, %s)', (type, name) => {
    expect(validateGifFile({ name, type, size: 1024 })).toEqual({ status: 'error', code: 'notGif' })
  })

  it('rejects an empty file', () => {
    expect(validateGifFile({ name: 'a.gif', type: 'image/gif', size: 0 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a negative size', () => {
    expect(validateGifFile({ name: 'a.gif', type: 'image/gif', size: -1 })).toEqual({
      status: 'error',
      code: 'empty',
    })
  })

  it('rejects a file above the 20 MB limit', () => {
    expect(validateGifFile({ name: 'a.gif', type: 'image/gif', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'tooLarge',
    })
  })

  it('accepts a file of exactly the maximum size', () => {
    expect(validateGifFile({ name: 'a.gif', type: 'image/gif', size: MAX_FILE_SIZE_BYTES })).toEqual(ok)
  })

  it('accepts a one-byte file (its content is checked later)', () => {
    expect(validateGifFile({ name: 'a.gif', type: 'image/gif', size: 1 })).toEqual(ok)
  })

  it('reports the wrong type before the size', () => {
    expect(validateGifFile({ name: 'a.png', type: 'image/png', size: MAX_FILE_SIZE_BYTES + 1 })).toEqual({
      status: 'error',
      code: 'notGif',
    })
  })
})

describe('getPngFileNameFromGif', () => {
  it.each([
    ['anim.gif', 'anim.png'],
    ['anim.GIF', 'anim.png'],
    ['Anim.Gif', 'Anim.png'],
    ['my.anim.gif', 'my.anim.png'],
    ['holiday (1).gif', 'holiday (1).png'],
    ['animação-ação.gif', 'animação-ação.png'],
    ['noextension', 'noextension.png'],
    ['anim.png', 'anim.png'],
    ['  spaced.gif  ', 'spaced.png'],
    ['.gif', 'imagem.png'],
    ['', 'imagem.png'],
    ['anim.gif.gif', 'anim.gif.png'],
  ])('%j → %j', (input, expected) => {
    expect(getPngFileNameFromGif(input)).toBe(expected)
  })
})

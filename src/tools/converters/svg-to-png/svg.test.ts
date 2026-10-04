import { describe, expect, it } from 'vitest'
import type { OutputSetting } from './convert'
import { getNaturalSize, parseLength, parseSvgRoot, parseViewBox, prepareSvg } from './svg'

// Pure string handling only: no DOM, no DOMParser — these run in a plain Node environment.

const scale = (value: number): OutputSetting => ({ kind: 'scale', value })
const width = (value: number): OutputSetting => ({ kind: 'width', value })

describe('parseLength', () => {
  it.each<[string, number]>([
    ['100', 100],
    ['100px', 100],
    ['  50.5  ', 50.5],
    ['1in', 96],
    ['72pt', 96],
    ['1pc', 16],
    ['25.4mm', 96],
    ['2.54cm', 96],
    ['1e2', 100],
    ['.5em', 8],
    ['2ex', 16],
    ['10PX', 10],
  ])('parses %j as %d px', (input, expected) => {
    expect(parseLength(input)).toBeCloseTo(expected, 8)
  })

  it.each(['10%', 'auto', '', '0', '-5', 'abc', '10 px', '10furlongs', '1e999', 'NaN', '+'])(
    'gives no size for %j',
    (input) => {
      expect(parseLength(input)).toBeNull()
    },
  )
})

describe('parseViewBox', () => {
  it.each<[string, { x: number; y: number; width: number; height: number }]>([
    ['0 0 100 50', { x: 0, y: 0, width: 100, height: 50 }],
    ['0,0,100,50', { x: 0, y: 0, width: 100, height: 50 }],
    [' 0 0 24 24 ', { x: 0, y: 0, width: 24, height: 24 }],
    ['-10 -20 30 40', { x: -10, y: -20, width: 30, height: 40 }],
    ['0 0 1.5 2.5', { x: 0, y: 0, width: 1.5, height: 2.5 }],
  ])('parses %j', (input, expected) => {
    expect(parseViewBox(input)).toEqual(expected)
  })

  it.each(['0 0 100', '0 0 0 50', '0 0 -1 5', 'a b c d', '', '0 0 100 50 7', '0 0 50 0'])(
    'rejects %j',
    (input) => {
      expect(parseViewBox(input)).toBeNull()
    },
  )
})

describe('parseSvgRoot', () => {
  it('finds the root tag and its attributes', () => {
    const tag = '<svg width="10" height="20">'
    const root = parseSvgRoot(`${tag}</svg>`)
    expect(root).not.toBeNull()
    expect(root?.attributes).toEqual([
      { name: 'width', value: '10', raw: 'width="10"' },
      { name: 'height', value: '20', raw: 'height="20"' },
    ])
    expect(root?.selfClosing).toBe(false)
    expect(root?.tagStart).toBe(0)
    expect(root?.tagEnd).toBe(tag.length)
  })

  it('skips an XML declaration, comments and a DOCTYPE before the root', () => {
    const text = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!-- a comment with <svg inside -->',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
      '<svg viewBox="0 0 1 1"/>',
    ].join('\n')
    const root = parseSvgRoot(text)
    expect(root?.selfClosing).toBe(true)
    expect(root?.attributes.map((attribute) => attribute.name)).toEqual(['viewBox'])
    expect(root?.tagStart).toBe(text.lastIndexOf('<svg viewBox'))
  })

  it('skips a byte order mark', () => {
    const root = parseSvgRoot('\uFEFF<svg width="1" height="1"/>')
    expect(root).not.toBeNull()
    expect(root?.tagStart).toBe(1)
  })

  it('accepts single quotes and spaces around "="', () => {
    const root = parseSvgRoot("<svg width = '10' height='20'>")
    expect(root?.attributes.map((attribute) => attribute.value)).toEqual(['10', '20'])
    expect(root?.attributes[0]?.raw).toBe("width = '10'")
  })

  it('handles a ">" inside a quoted attribute value', () => {
    const text = '<svg data-x="a>b" width="5">'
    const root = parseSvgRoot(text)
    expect(root?.attributes.map((attribute) => attribute.name)).toEqual(['data-x', 'width'])
    expect(root?.tagEnd).toBe(text.length)
  })

  it('keeps namespaced attribute names', () => {
    const root = parseSvgRoot('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">')
    expect(root?.attributes.map((attribute) => attribute.name)).toEqual(['xmlns', 'xmlns:xlink'])
  })

  it('accepts a root with no attributes', () => {
    const root = parseSvgRoot('<svg></svg>')
    expect(root?.attributes).toEqual([])
    expect(root?.selfClosing).toBe(false)
  })

  it('reports where a self-closing root ends', () => {
    const text = '<svg width="1"/>'
    expect(parseSvgRoot(text)?.tagEnd).toBe(text.length)
  })

  it.each([
    '',
    '   ',
    'hello',
    '<html><body></body></html>',
    '<svgfoo>',
    '<svg:svg xmlns:svg="x">',
    '<svg',
    '<svg width="10"',
    '<svg width=10>',
    '<svg disabled>',
    '<svg width="10>',
    '<?xml version="1.0"?>',
    '<!-- unterminated <svg>',
    '<svg/ >',
  ])('rejects %j', (text) => {
    expect(parseSvgRoot(text)).toBeNull()
  })
})

describe('getNaturalSize', () => {
  function natural(text: string) {
    const root = parseSvgRoot(text)
    if (!root) throw new Error(`Could not parse ${text}`)
    return getNaturalSize(root)
  }

  it('uses width and height when both are set', () => {
    expect(natural('<svg width="100" height="50">')).toEqual({ size: { width: 100, height: 50 }, viewBox: null })
  })

  it('converts units', () => {
    const result = natural('<svg width="1in" height="72pt">')
    expect(result?.size.width).toBeCloseTo(96, 8)
    expect(result?.size.height).toBeCloseTo(96, 8)
  })

  it('keeps width and height even when the viewBox has another ratio', () => {
    expect(natural('<svg width="200" height="100" viewBox="0 0 10 10">')).toEqual({
      size: { width: 200, height: 100 },
      viewBox: { x: 0, y: 0, width: 10, height: 10 },
    })
  })

  it('uses the viewBox when there is no width or height', () => {
    expect(natural('<svg viewBox="0 0 24 24">')?.size).toEqual({ width: 24, height: 24 })
  })

  it('derives the height from the viewBox ratio when only the width is set', () => {
    expect(natural('<svg width="100" viewBox="0 0 50 25">')?.size).toEqual({ width: 100, height: 50 })
  })

  it('derives the width from the viewBox ratio when only the height is set', () => {
    expect(natural('<svg height="40" viewBox="0 0 50 25">')?.size).toEqual({ width: 80, height: 40 })
  })

  it('ignores percentage sizes and falls back to the viewBox', () => {
    expect(natural('<svg width="100%" height="100%" viewBox="0 0 30 20">')?.size).toEqual({ width: 30, height: 20 })
  })

  it('ignores an invalid width and derives it from the viewBox', () => {
    expect(natural('<svg width="abc" height="10" viewBox="0 0 20 10">')?.size).toEqual({ width: 20, height: 10 })
  })

  it('gives no size when nothing defines one', () => {
    expect(natural('<svg>')).toBeNull()
  })

  it('gives no size for a width without a viewBox', () => {
    expect(natural('<svg width="100">')).toBeNull()
  })

  it('gives no size for an invalid viewBox and no width or height', () => {
    expect(natural('<svg viewBox="0 0 0 0">')).toBeNull()
  })

  it('gives no size for zero width and height', () => {
    expect(natural('<svg width="0" height="0">')).toBeNull()
  })
})

describe('prepareSvg', () => {
  const simple =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50"/></svg>'

  it('computes the output size and keeps the SVG size', () => {
    const result = prepareSvg(simple, scale(2))
    expect(result).toMatchObject({ status: 'ok', width: 200, height: 100, naturalWidth: 100, naturalHeight: 50 })
  })

  it('rewrites only the root tag and keeps the rest of the document', () => {
    const result = prepareSvg(simple, scale(2))
    expect(result.status === 'ok' && result.source).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 100 50"><rect width="100" height="50"/></svg>',
    )
  })

  it('adds the SVG namespace when it is missing', () => {
    const result = prepareSvg('<svg width="10" height="10"></svg>', scale(1))
    expect(result.status === 'ok' && result.source).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"></svg>',
    )
  })

  it('does not duplicate an existing namespace declaration', () => {
    const result = prepareSvg(simple, scale(1))
    expect(result.status === 'ok' && result.source.match(/xmlns=/g)?.length).toBe(1)
  })

  it('keeps the prolog and the other root attributes', () => {
    const text =
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class=\'icon\' viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'
    const result = prepareSvg(text, scale(2))
    expect(result).toMatchObject({ status: 'ok', width: 48, height: 48 })
    expect(result.status === 'ok' && result.source).toBe(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class=\'icon\' width="48" height="48" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
    )
  })

  it('fits a viewBox-only SVG to a requested width, keeping its ratio', () => {
    const result = prepareSvg('<svg viewBox="0 0 24 12"></svg>', width(1024))
    expect(result).toMatchObject({ status: 'ok', width: 1024, height: 512 })
    expect(result.status === 'ok' && result.source).toContain('width="1024" height="512" viewBox="0 0 24 12"')
  })

  it('adds a viewBox from the SVG size so the content scales instead of being cropped', () => {
    const result = prepareSvg('<svg width="30" height="20"></svg>', scale(3))
    expect(result.status === 'ok' && result.source).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="60" viewBox="0 0 30 20"></svg>',
    )
  })

  it('leaves exactly one width, height and viewBox on the root tag', () => {
    const result = prepareSvg(simple, scale(2))
    const root = result.status === 'ok' ? parseSvgRoot(result.source) : null
    const names = root?.attributes.map((attribute) => attribute.name) ?? []
    expect(names.filter((name) => name === 'width')).toHaveLength(1)
    expect(names.filter((name) => name === 'height')).toHaveLength(1)
    expect(names.filter((name) => name === 'viewBox')).toHaveLength(1)
  })

  it('supports a self-closing root', () => {
    const result = prepareSvg('<svg width="10" height="10"/>', scale(1))
    expect(result.status === 'ok' && result.source).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"/>',
    )
  })

  it.each<[string, string]>([
    ['', 'invalidSvg'],
    ['   ', 'invalidSvg'],
    ['plain text', 'invalidSvg'],
    ['<html></html>', 'invalidSvg'],
    ['<svg width="10" height="10"', 'invalidSvg'],
    ['<svg width="10" height="10"><rect/>', 'invalidSvg'],
    ['<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "b">]><svg width="1" height="1"></svg>', 'unsafeContent'],
    ['<!DOCTYPE svg [<!entity a "b">]><svg width="1" height="1"></svg>', 'unsafeContent'],
    ['<svg></svg>', 'noDimensions'],
    ['<svg width="100"></svg>', 'noDimensions'],
    ['<svg width="auto" height="auto"></svg>', 'noDimensions'],
    ['<svg width="10000" height="10000"></svg>', 'outputTooLarge'],
  ])('refuses %j with %s', (text, code) => {
    expect(prepareSvg(text, scale(1))).toEqual({ status: 'error', code })
  })

  it('refuses an extreme aspect ratio that would exceed the output limits', () => {
    expect(prepareSvg('<svg viewBox="0 0 1 100000"></svg>', width(4096))).toEqual({
      status: 'error',
      code: 'outputTooLarge',
    })
  })

  it('leaves scripts, links and styles in the document untouched (they are never run here)', () => {
    const text =
      '<svg width="10" height="10"><script>alert(1)</script><image href="https://example.com/x.png"/></svg>'
    const result = prepareSvg(text, scale(1))
    expect(result.status === 'ok' && result.source.endsWith('<script>alert(1)</script><image href="https://example.com/x.png"/></svg>')).toBe(true)
  })
})

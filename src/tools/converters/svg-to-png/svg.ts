// Pure SVG text handling — no React, no DOM, no DOMParser, no innerHTML. The uploaded markup is
// only ever treated as a string here: this module finds the root <svg> tag, reads its size
// (width/height/viewBox), and rewrites just that tag so the image renders at the wanted
// output size. The result is later drawn through an isolated <img> (see `convertImage.ts`);
// it is never inserted into the page.

import { calculateOutputSize, type OutputSetting } from './convert'

export interface RootAttribute {
  name: string
  value: string
  /** The attribute exactly as written in the source (name, spacing, quotes and value). */
  raw: string
}

export interface SvgRoot {
  attributes: RootAttribute[]
  selfClosing: boolean
  /** Index of the `<` that opens the root tag. */
  tagStart: number
  /** Index just after the `>` that closes the root tag. */
  tagEnd: number
}

export interface SvgSize {
  width: number
  height: number
}

export interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

export interface NaturalSize {
  size: SvgSize
  viewBox: ViewBox | null
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MAX_PROLOG_ITEMS = 1000
const LENGTH_PATTERN = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([a-z%]*)$/i

/**
 * Parses an SVG length such as "24", "24px", "1in" or "2.5cm" into CSS pixels. Percentages,
 * "auto", zero, negative and non-numeric values give `null` (they do not define a size).
 */
export function parseLength(value: string): number | null {
  const match = LENGTH_PATTERN.exec(value.trim())
  if (!match) return null

  const amount = Number(match[1])
  const unit = (match[2] ?? '').toLowerCase()

  let pixels: number
  switch (unit) {
    case '':
    case 'px':
      pixels = amount
      break
    case 'pt':
      pixels = (amount * 96) / 72
      break
    case 'pc':
      pixels = amount * 16
      break
    case 'mm':
      pixels = (amount * 96) / 25.4
      break
    case 'cm':
      pixels = (amount * 96) / 2.54
      break
    case 'in':
      pixels = amount * 96
      break
    case 'em':
      pixels = amount * 16
      break
    case 'ex':
      pixels = amount * 8
      break
    default:
      return null
  }

  return Number.isFinite(pixels) && pixels > 0 ? pixels : null
}

/** Parses a `viewBox` ("minX minY width height", spaces and/or commas). Needs a positive size. */
export function parseViewBox(value: string): ViewBox | null {
  const parts = value.trim().split(/[\s,]+/)
  if (parts.length !== 4) return null

  const [x, y, width, height] = parts.map((part) => Number(part))
  if (x === undefined || y === undefined || width === undefined || height === undefined) return null
  if (![x, y, width, height].every((number) => Number.isFinite(number))) return null
  if (width <= 0 || height <= 0) return null

  return { x, y, width, height }
}

function skipWhitespace(text: string, index: number): number {
  let i = index
  while (i < text.length && /\s/.test(text.charAt(i))) i += 1
  return i
}

/** Index just after a `<!DOCTYPE …>` that starts at `index` (handles `[ … ]` and quotes), or -1. */
function skipDoctype(text: string, index: number): number {
  let i = index + '<!DOCTYPE'.length
  let depth = 0
  let quote = ''

  while (i < text.length) {
    const char = text.charAt(i)
    if (quote) {
      if (char === quote) quote = ''
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === '[') {
      depth += 1
    } else if (char === ']') {
      depth = Math.max(0, depth - 1)
    } else if (char === '>' && depth === 0) {
      return i + 1
    }
    i += 1
  }
  return -1
}

/** Index of the first thing after the BOM, XML declaration, comments and DOCTYPE, or -1. */
function findRootStart(text: string): number {
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0

  for (let guard = 0; guard < MAX_PROLOG_ITEMS; guard += 1) {
    i = skipWhitespace(text, i)

    if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2)
      if (end === -1) return -1
      i = end + 2
    } else if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4)
      if (end === -1) return -1
      i = end + 3
    } else if (text.slice(i, i + 9).toUpperCase() === '<!DOCTYPE') {
      const end = skipDoctype(text, i)
      if (end === -1) return -1
      i = end
    } else {
      return i
    }
  }
  return -1
}

/**
 * Finds and tokenizes the root `<svg …>` tag. Strict, like XML: attribute values must be quoted
 * and every attribute needs a value. Returns `null` when the document does not start with an
 * `<svg>` element, or when the tag is malformed or unterminated.
 */
export function parseSvgRoot(text: string): SvgRoot | null {
  const start = findRootStart(text)
  if (start === -1 || !text.startsWith('<svg', start)) return null

  const afterName = start + '<svg'.length
  const next = text.charAt(afterName)
  // Reject "<svgfoo>" and prefixed roots such as "<svg:svg>".
  if (next !== '' && !/[\s/>]/.test(next)) return null

  const attributes: RootAttribute[] = []
  let i = afterName

  while (i < text.length) {
    i = skipWhitespace(text, i)
    const char = text.charAt(i)

    if (char === '>') return { attributes, selfClosing: false, tagStart: start, tagEnd: i + 1 }
    if (char === '/') {
      return text.charAt(i + 1) === '>' ? { attributes, selfClosing: true, tagStart: start, tagEnd: i + 2 } : null
    }

    const nameStart = i
    while (i < text.length && !/[\s=/>]/.test(text.charAt(i))) i += 1
    if (i === nameStart) return null
    const name = text.slice(nameStart, i)

    const equalsAt = skipWhitespace(text, i)
    if (text.charAt(equalsAt) !== '=') return null

    const valueAt = skipWhitespace(text, equalsAt + 1)
    const quote = text.charAt(valueAt)
    if (quote !== '"' && quote !== "'") return null
    const close = text.indexOf(quote, valueAt + 1)
    if (close === -1) return null

    i = close + 1
    attributes.push({ name, value: text.slice(valueAt + 1, close), raw: text.slice(nameStart, i) })
  }

  return null
}

function getAttribute(root: SvgRoot, name: string): string {
  return root.attributes.find((attribute) => attribute.name === name)?.value ?? ''
}

/**
 * The SVG's own size in pixels, from `width`/`height` and `viewBox`, keeping the aspect ratio:
 * both sizes → used as they are; one size + viewBox → the other follows the viewBox ratio;
 * viewBox only → the viewBox size. Percentages, zero or invalid values count as missing.
 * Returns `null` when no size can be determined.
 */
export function getNaturalSize(root: SvgRoot): NaturalSize | null {
  const width = parseLength(getAttribute(root, 'width'))
  const height = parseLength(getAttribute(root, 'height'))
  const viewBox = parseViewBox(getAttribute(root, 'viewBox'))

  if (width !== null && height !== null) return { size: { width, height }, viewBox }

  if (viewBox) {
    if (width !== null) return { size: { width, height: (width * viewBox.height) / viewBox.width }, viewBox }
    if (height !== null) return { size: { width: (height * viewBox.width) / viewBox.height, height }, viewBox }
    return { size: { width: viewBox.width, height: viewBox.height }, viewBox }
  }

  return null
}

export type SvgPrepareErrorCode = 'invalidSvg' | 'unsafeContent' | 'noDimensions' | 'outputTooLarge'

export type PrepareResult =
  | {
      status: 'ok'
      /** The SVG text with its root tag rewritten for the output size. */
      source: string
      /** PNG size in pixels. */
      width: number
      height: number
      /** The SVG's own size in pixels. */
      naturalWidth: number
      naturalHeight: number
    }
  | { status: 'error'; code: SvgPrepareErrorCode }

function failure(code: SvgPrepareErrorCode): PrepareResult {
  return { status: 'error', code }
}

/** Replaces the root tag with one that has the output size, a viewBox and the SVG namespace. */
function rewriteRoot(text: string, root: SvgRoot, width: number, height: number, natural: NaturalSize): string {
  const kept = root.attributes.filter(
    (attribute) => attribute.name !== 'width' && attribute.name !== 'height' && attribute.name !== 'viewBox',
  )
  const viewBox = natural.viewBox ?? { x: 0, y: 0, width: natural.size.width, height: natural.size.height }

  const parts = ['<svg', ...kept.map((attribute) => attribute.raw)]
  // A standalone SVG without its namespace does not render as an image.
  if (!root.attributes.some((attribute) => attribute.name === 'xmlns')) parts.push(`xmlns="${SVG_NAMESPACE}"`)
  parts.push(
    `width="${width}"`,
    `height="${height}"`,
    `viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"`,
  )

  const tag = parts.join(' ') + (root.selfClosing ? '/>' : '>')
  return text.slice(0, root.tagStart) + tag + text.slice(root.tagEnd)
}

/**
 * Validates SVG text and prepares it for rendering at the requested output size.
 *
 * Checks, in order: no `<!ENTITY` declarations (entity expansion can be used to exhaust memory,
 * so such files are refused); the document starts with a well-formed `<svg>` root tag and is
 * closed; a size can be determined; the output size is within the limits. The content of the
 * SVG (scripts, links, styles…) is not interpreted or altered here: it is only ever rendered
 * through an isolated image, where browsers do not run scripts or load external resources.
 */
export function prepareSvg(text: string, setting: OutputSetting): PrepareResult {
  if (/<!ENTITY/i.test(text)) return failure('unsafeContent')

  const root = parseSvgRoot(text)
  if (!root) return failure('invalidSvg')
  if (!root.selfClosing && !/<\/svg\s*>/i.test(text.slice(root.tagEnd))) return failure('invalidSvg')

  const natural = getNaturalSize(root)
  if (!natural) return failure('noDimensions')

  const output = calculateOutputSize(natural.size, setting)
  if (output.status === 'error') return failure(output.code === 'outputTooLarge' ? 'outputTooLarge' : 'noDimensions')

  return {
    status: 'ok',
    source: rewriteRoot(text, root, output.width, output.height, natural),
    width: output.width,
    height: output.height,
    naturalWidth: natural.size.width,
    naturalHeight: natural.size.height,
  }
}

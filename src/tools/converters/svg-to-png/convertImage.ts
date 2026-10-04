// Browser-only conversion: renders an SVG through an isolated <img> and exports it as PNG.
// Pure parsing, validation and sizing live in `svg.ts` / `convert.ts` (unit-tested); this file
// needs a real browser (Image + Canvas), so it is not covered by Vitest.
//
// Security model
// - The uploaded markup is never inserted into the page: no innerHTML, no <object>, <iframe> or
//   <embed>, and the SVG is never displayed (only the resulting PNG is previewed).
// - It is loaded as an image from a Blob URL. Browsers render SVG-as-image in a restricted
//   mode: scripts and event handlers do not run, and external resources (images, fonts,
//   stylesheets, remote <use>/<image> references) are not loaded.
// - Files with <!ENTITY> declarations are refused before rendering (see `prepareSvg`), and the
//   load has a timeout so a hanging file cannot block the queue.
// - Output size is capped (see `calculateOutputSize`) so a large scale cannot exhaust memory.
// - Nothing is sent over the network; the temporary Blob URL is revoked when done.

import { prepareSvg, type SvgPrepareErrorCode } from './svg'
import type { OutputSetting } from './convert'

/** How long to wait for the browser to load an SVG before giving up. */
const LOAD_TIMEOUT_MS = 15_000

export type SvgConvertErrorCode = SvgPrepareErrorCode | 'decodeFailed' | 'conversionFailed'

export type SvgConvertResult =
  | { status: 'ok'; blob: Blob; width: number; height: number }
  | { status: 'error'; code: SvgConvertErrorCode }

function failure(code: SvgConvertErrorCode): SvgConvertResult {
  return { status: 'error', code }
}

/** Loads an image from a URL, rejecting on error or after {@link LOAD_TIMEOUT_MS}. */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    const settle = (outcome: () => void) => {
      window.clearTimeout(timer)
      image.onload = null
      image.onerror = null
      outcome()
    }

    const timer = window.setTimeout(() => {
      // Stop loading before giving up.
      image.removeAttribute('src')
      settle(() => reject(new Error('SVG load timed out')))
    }, LOAD_TIMEOUT_MS)
    image.onload = () => settle(() => resolve(image))
    image.onerror = () => settle(() => reject(new Error('SVG failed to load')))
    image.src = url
  })
}

/**
 * Converts one SVG file to PNG, keeping its aspect ratio and a transparent background.
 *
 * Never throws: malformed or unsupported SVG content, size problems and rendering failures
 * all come back as an error result.
 */
export async function convertSvgToPng(file: Blob, setting: OutputSetting): Promise<SvgConvertResult> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return failure('decodeFailed')
  }

  const prepared = prepareSvg(text, setting)
  if (prepared.status === 'error') return failure(prepared.code)
  const { source, width, height } = prepared

  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    let image: HTMLImageElement
    try {
      image = await loadImage(url)
    } catch {
      // Malformed XML, unsupported content or a timeout.
      return failure('invalidSvg')
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return failure('conversionFailed')

    // The SVG already has the output size, so it is drawn 1:1 and stays sharp.
    context.drawImage(image, 0, 0, width, height)
    // Throws if the browser considers the canvas tainted; that is handled below.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

    // Free the canvas backing store right away instead of waiting for garbage collection.
    canvas.width = 0
    canvas.height = 0

    if (!blob || blob.size === 0) return failure('conversionFailed')
    return { status: 'ok', blob, width, height }
  } catch {
    return failure('conversionFailed')
  } finally {
    URL.revokeObjectURL(url)
  }
}

import { describe, expect, it } from 'vitest'
import { A4_HEIGHT_PT, A4_WIDTH_PT, PAGE_MARGIN_PT, fitImageToPage, type PageLayout } from './layout'

// Pure maths only: no PDF library, no DOM.

function layoutOf(width: number, height: number): PageLayout {
  const layout = fitImageToPage(width, height)
  if (!layout) throw new Error(`Expected a layout for ${width} × ${height}`)
  return layout
}

describe('A4 constants', () => {
  it('matches the A4 size in points (210 × 297 mm)', () => {
    expect(A4_WIDTH_PT).toBeCloseTo((210 / 25.4) * 72, 1)
    expect(A4_HEIGHT_PT).toBeCloseTo((297 / 25.4) * 72, 1)
  })

  it('keeps a margin around the image', () => {
    expect(PAGE_MARGIN_PT).toBeGreaterThan(0)
    expect(PAGE_MARGIN_PT * 2).toBeLessThan(A4_WIDTH_PT)
  })
})

describe('fitImageToPage: page orientation', () => {
  it('uses a portrait A4 page for a portrait image', () => {
    const layout = layoutOf(1000, 2000)
    expect(layout.pageWidth).toBe(A4_WIDTH_PT)
    expect(layout.pageHeight).toBe(A4_HEIGHT_PT)
  })

  it('uses a landscape A4 page for a landscape image', () => {
    const layout = layoutOf(2000, 1000)
    expect(layout.pageWidth).toBe(A4_HEIGHT_PT)
    expect(layout.pageHeight).toBe(A4_WIDTH_PT)
  })

  it('uses a portrait page for a square image', () => {
    const layout = layoutOf(500, 500)
    expect(layout.pageWidth).toBe(A4_WIDTH_PT)
    expect(layout.pageHeight).toBe(A4_HEIGHT_PT)
  })

  it('switches orientation exactly when the image becomes wider than tall', () => {
    expect(layoutOf(1000, 1001).pageWidth).toBe(A4_WIDTH_PT)
    expect(layoutOf(1001, 1000).pageWidth).toBe(A4_HEIGHT_PT)
  })
})

describe('fitImageToPage: exact placement', () => {
  it('fits a 1:2 portrait image by its height', () => {
    const layout = layoutOf(1000, 2000)
    const availableHeight = A4_HEIGHT_PT - 2 * PAGE_MARGIN_PT
    expect(layout.height).toBeCloseTo(availableHeight, 6)
    expect(layout.width).toBeCloseTo(availableHeight / 2, 6)
    expect(layout.x).toBeCloseTo((A4_WIDTH_PT - availableHeight / 2) / 2, 6)
    expect(layout.y).toBeCloseTo(PAGE_MARGIN_PT, 6)
  })

  it('fits a 2:1 landscape image by its width', () => {
    const layout = layoutOf(2000, 1000)
    const availableWidth = A4_HEIGHT_PT - 2 * PAGE_MARGIN_PT
    expect(layout.width).toBeCloseTo(availableWidth, 6)
    expect(layout.height).toBeCloseTo(availableWidth / 2, 6)
    expect(layout.x).toBeCloseTo(PAGE_MARGIN_PT, 6)
    expect(layout.y).toBeCloseTo((A4_WIDTH_PT - availableWidth / 2) / 2, 6)
  })

  it('fits a square image by the width of a portrait page', () => {
    const layout = layoutOf(800, 800)
    const availableWidth = A4_WIDTH_PT - 2 * PAGE_MARGIN_PT
    expect(layout.width).toBeCloseTo(availableWidth, 6)
    expect(layout.height).toBeCloseTo(availableWidth, 6)
    expect(layout.x).toBeCloseTo(PAGE_MARGIN_PT, 6)
    expect(layout.y).toBeCloseTo((A4_HEIGHT_PT - availableWidth) / 2, 6)
  })
})

describe('fitImageToPage: every image fits, centred, uncropped and undistorted', () => {
  const sizes: Array<[number, number]> = [
    [1, 1],
    [100, 100],
    [210, 297],
    [297, 210],
    [595, 842],
    [3000, 4000],
    [4000, 3000],
    [3508, 2480],
    [5000, 5000],
    [1, 1000],
    [1000, 1],
    [100.5, 50.25],
  ]

  it.each(sizes)('%d × %d', (imageWidth, imageHeight) => {
    const layout = layoutOf(imageWidth, imageHeight)
    const epsilon = 1e-9

    // Not cropped: the whole image is inside the page, inside the margins.
    expect(layout.x).toBeGreaterThanOrEqual(PAGE_MARGIN_PT - epsilon)
    expect(layout.y).toBeGreaterThanOrEqual(PAGE_MARGIN_PT - epsilon)
    expect(layout.x + layout.width).toBeLessThanOrEqual(layout.pageWidth - PAGE_MARGIN_PT + epsilon)
    expect(layout.y + layout.height).toBeLessThanOrEqual(layout.pageHeight - PAGE_MARGIN_PT + epsilon)

    // Centred on both axes.
    expect(layout.x + layout.width / 2).toBeCloseTo(layout.pageWidth / 2, 6)
    expect(layout.y + layout.height / 2).toBeCloseTo(layout.pageHeight / 2, 6)

    // Not distorted: same aspect ratio as the image.
    expect(layout.width / layout.height).toBeCloseTo(imageWidth / imageHeight, 6)

    // Uses the available space: it touches the margin on at least one axis.
    const fillsWidth = Math.abs(layout.width - (layout.pageWidth - 2 * PAGE_MARGIN_PT)) < 1e-6
    const fillsHeight = Math.abs(layout.height - (layout.pageHeight - 2 * PAGE_MARGIN_PT)) < 1e-6
    expect(fillsWidth || fillsHeight).toBe(true)

    // The page is always A4 (in one of the two orientations).
    expect([layout.pageWidth, layout.pageHeight].sort((a, b) => a - b)).toEqual([A4_WIDTH_PT, A4_HEIGHT_PT])
  })

  it('scales a small image up to fill the page', () => {
    const layout = layoutOf(10, 10)
    expect(layout.width).toBeCloseTo(A4_WIDTH_PT - 2 * PAGE_MARGIN_PT, 6)
  })

  it('scales a large image down to fit the page', () => {
    const layout = layoutOf(10000, 10000)
    expect(layout.width).toBeCloseTo(A4_WIDTH_PT - 2 * PAGE_MARGIN_PT, 6)
    expect(layout.height).toBeCloseTo(A4_WIDTH_PT - 2 * PAGE_MARGIN_PT, 6)
  })

  it('gives the same layout for the same shape at different pixel sizes', () => {
    const small = layoutOf(400, 300)
    const large = layoutOf(4000, 3000)
    expect(large.width).toBeCloseTo(small.width, 6)
    expect(large.height).toBeCloseTo(small.height, 6)
    expect(large.x).toBeCloseTo(small.x, 6)
    expect(large.y).toBeCloseTo(small.y, 6)
  })
})

describe('fitImageToPage: invalid sizes', () => {
  it.each([
    [0, 10],
    [10, 0],
    [-1, 5],
    [5, -1],
    [NaN, 5],
    [5, NaN],
    [Infinity, 5],
    [5, Infinity],
  ])('returns null for %d × %d', (width, height) => {
    expect(fitImageToPage(width, height)).toBeNull()
  })
})

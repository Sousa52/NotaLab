// Pure page-layout maths for the Images → PDF tool — no React, no DOM, no PDF library. Works in
// PDF points (1/72 inch), with the origin at the bottom-left corner of the page, as PDF does.

/** A4 size in points. */
export const A4_WIDTH_PT = 595.28
export const A4_HEIGHT_PT = 841.89

/** Blank space kept around the image on every side (0.25 inch). */
export const PAGE_MARGIN_PT = 18

export interface PageLayout {
  /** Size of the page. */
  pageWidth: number
  pageHeight: number
  /** Where the image's bottom-left corner goes, and how big it is drawn. */
  x: number
  y: number
  width: number
  height: number
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/**
 * Fits an image on an A4 page without cropping or distorting it: the page is landscape when the
 * image is wider than tall and portrait otherwise (so a square image gets a portrait page); the
 * image is scaled (up or down) by one factor until it fits inside the margins, then centred.
 * Returns `null` when the image size is not a positive finite number.
 */
export function fitImageToPage(imageWidth: number, imageHeight: number): PageLayout | null {
  if (!isPositiveFinite(imageWidth) || !isPositiveFinite(imageHeight)) return null

  const landscape = imageWidth > imageHeight
  const pageWidth = landscape ? A4_HEIGHT_PT : A4_WIDTH_PT
  const pageHeight = landscape ? A4_WIDTH_PT : A4_HEIGHT_PT

  const scale = Math.min((pageWidth - 2 * PAGE_MARGIN_PT) / imageWidth, (pageHeight - 2 * PAGE_MARGIN_PT) / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  }
}

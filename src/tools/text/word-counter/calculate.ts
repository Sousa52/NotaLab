export interface TextStats {
  words: number
  characters: number
  charactersNoSpaces: number
  sentences: number
  paragraphs: number
  lines: number
}

/** Normalizes Windows (\r\n) and old Mac (\r) line endings to \n. */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/** Words are runs of non-whitespace characters, so repeated/leading/trailing spaces never inflate the count. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  return trimmed.split(/\s+/).length
}

export function countCharacters(text: string): number {
  return text.length
}

export function countCharactersNoSpaces(text: string): number {
  return text.replace(/\s/g, '').length
}

/**
 * Sentences are runs of text ending in one or more ".", "!" or "?" (so "..." and "?!"
 * count as a single boundary), plus a trailing run with no terminal punctuation if present.
 * Segments with no letters or digits (e.g. a lone "...") are not counted as sentences.
 */
export function countSentences(text: string): number {
  const trimmed = text.trim()
  if (trimmed === '') return 0

  const segments = trimmed.match(/[^.!?]*[.!?]+|[^.!?]+$/g) ?? []
  return segments.filter((segment) => /[\p{L}\p{N}]/u.test(segment)).length
}

/** Paragraphs are blocks of text separated by one or more blank lines. */
export function countParagraphs(text: string): number {
  const normalized = normalizeLineEndings(text).trim()
  if (normalized === '') return 0

  return normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '').length
}

/** Lines are counted the way a text editor would: every \n starts a new line. */
export function countLines(text: string): number {
  if (text === '') return 0
  return normalizeLineEndings(text).split('\n').length
}

export function analyzeText(text: string): TextStats {
  return {
    words: countWords(text),
    characters: countCharacters(text),
    charactersNoSpaces: countCharactersNoSpaces(text),
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    lines: countLines(text),
  }
}

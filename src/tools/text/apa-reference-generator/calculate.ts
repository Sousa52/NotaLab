export type SourceTypeId = 'book' | 'website' | 'article' | 'thesis'

export interface SourceTypeOption {
  id: SourceTypeId
  label: string
}

export const SOURCE_TYPES: SourceTypeOption[] = [
  { id: 'book', label: 'Livro' },
  { id: 'website', label: 'Website' },
  { id: 'article', label: 'Artigo científico' },
  { id: 'thesis', label: 'Tese ou dissertação' },
]

export interface BookFields {
  author: string
  year: string
  title: string
  publisher: string
}

export interface WebsiteFields {
  author: string
  year: string
  pageTitle: string
  siteName: string
  url: string
}

export interface ArticleFields {
  author: string
  year: string
  articleTitle: string
  journalName: string
  volume: string
  issue: string
  pages: string
  doiOrUrl: string
}

export interface ThesisFields {
  author: string
  year: string
  title: string
  workType: string
  institution: string
  url: string
}

export type ReferenceInput =
  | { type: 'book'; fields: BookFields }
  | { type: 'website'; fields: WebsiteFields }
  | { type: 'article'; fields: ArticleFields }
  | { type: 'thesis'; fields: ThesisFields }

export type ReferenceResult =
  | { status: 'ok'; reference: string }
  | { status: 'invalid'; errors: Record<string, string> }

const REQUIRED_FIELD_ERROR = 'Campo obrigatório.'
const YEAR_FORMAT_ERROR = 'Introduz um ano válido (4 dígitos, ex.: 2024).'

/** Collapses internal whitespace and trims the ends — the only normalization applied to free-text fields. */
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function isEmpty(value: string): boolean {
  return normalizeWhitespace(value) === ''
}

function isValidYear(value: string): boolean {
  return /^\d{4}$/.test(normalizeWhitespace(value))
}

/** Removes a trailing period (and any trailing whitespace) so it can be safely re-joined without doubling up. */
function stripTrailingPeriod(value: string): string {
  return value.replace(/[.\s]+$/, '')
}

/** Adds a trailing period unless the text already ends in ., ! or ? (or is empty). */
function ensureTrailingPeriod(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return trimmed
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

// --- Validation --------------------------------------------------------------------

export function validateBookFields(fields: BookFields): Record<string, string> {
  const errors: Record<string, string> = {}
  if (isEmpty(fields.author)) errors.author = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.year)) errors.year = REQUIRED_FIELD_ERROR
  else if (!isValidYear(fields.year)) errors.year = YEAR_FORMAT_ERROR
  if (isEmpty(fields.title)) errors.title = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.publisher)) errors.publisher = REQUIRED_FIELD_ERROR
  return errors
}

export function validateWebsiteFields(fields: WebsiteFields): Record<string, string> {
  const errors: Record<string, string> = {}
  if (isEmpty(fields.author)) errors.author = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.year)) errors.year = REQUIRED_FIELD_ERROR
  else if (!isValidYear(fields.year)) errors.year = YEAR_FORMAT_ERROR
  if (isEmpty(fields.pageTitle)) errors.pageTitle = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.siteName)) errors.siteName = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.url)) errors.url = REQUIRED_FIELD_ERROR
  return errors
}

export function validateArticleFields(fields: ArticleFields): Record<string, string> {
  const errors: Record<string, string> = {}
  if (isEmpty(fields.author)) errors.author = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.year)) errors.year = REQUIRED_FIELD_ERROR
  else if (!isValidYear(fields.year)) errors.year = YEAR_FORMAT_ERROR
  if (isEmpty(fields.articleTitle)) errors.articleTitle = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.journalName)) errors.journalName = REQUIRED_FIELD_ERROR
  // volume, issue, pages and doiOrUrl are all optional.
  return errors
}

export function validateThesisFields(fields: ThesisFields): Record<string, string> {
  const errors: Record<string, string> = {}
  if (isEmpty(fields.author)) errors.author = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.year)) errors.year = REQUIRED_FIELD_ERROR
  else if (!isValidYear(fields.year)) errors.year = YEAR_FORMAT_ERROR
  if (isEmpty(fields.title)) errors.title = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.workType)) errors.workType = REQUIRED_FIELD_ERROR
  if (isEmpty(fields.institution)) errors.institution = REQUIRED_FIELD_ERROR
  // url is optional.
  return errors
}

// --- Formatting ----------------------------------------------------------------
// Every generator assumes its fields already passed validation. Author names are
// used exactly as entered (no name-parsing/reformatting, per design) and are only
// whitespace-normalized — never stripped of trailing punctuation, since a trailing
// period is often intentional there (e.g. "Silva, J.") and nothing of ours is
// concatenated directly after it. Title-like fields ARE stripped of a trailing
// period, since we immediately follow them with our own ". " separator and would
// otherwise double up ("Título.. Editora.").

export function formatBookReference(fields: BookFields): string {
  const author = normalizeWhitespace(fields.author)
  const year = normalizeWhitespace(fields.year)
  const title = stripTrailingPeriod(normalizeWhitespace(fields.title))
  const publisher = ensureTrailingPeriod(normalizeWhitespace(fields.publisher))

  return `${author} (${year}). ${title}. ${publisher}`
}

export function formatWebsiteReference(fields: WebsiteFields): string {
  const author = normalizeWhitespace(fields.author)
  const year = normalizeWhitespace(fields.year)
  const pageTitle = stripTrailingPeriod(normalizeWhitespace(fields.pageTitle))
  const siteName = ensureTrailingPeriod(normalizeWhitespace(fields.siteName))
  const url = normalizeWhitespace(fields.url)

  return `${author} (${year}). ${pageTitle}. ${siteName} ${url}`
}

/** Builds the "volume(issue)" segment, gracefully handling either part being absent. */
function formatVolumeIssue(volume: string, issue: string): string {
  const v = normalizeWhitespace(volume)
  const i = normalizeWhitespace(issue)
  if (v && i) return `${v}(${i})`
  if (v) return v
  if (i) return `(${i})`
  return ''
}

export function formatArticleReference(fields: ArticleFields): string {
  const author = normalizeWhitespace(fields.author)
  const year = normalizeWhitespace(fields.year)
  const articleTitle = stripTrailingPeriod(normalizeWhitespace(fields.articleTitle))
  const journalName = normalizeWhitespace(fields.journalName)
  const volumeIssue = formatVolumeIssue(fields.volume, fields.issue)
  const pages = normalizeWhitespace(fields.pages)
  const doiOrUrl = normalizeWhitespace(fields.doiOrUrl)

  const journalSegmentParts = [journalName, volumeIssue, pages].filter((part) => part !== '')
  const journalSegment = ensureTrailingPeriod(journalSegmentParts.join(', '))

  const base = `${author} (${year}). ${articleTitle}. ${journalSegment}`
  return doiOrUrl ? `${base} ${doiOrUrl}` : base
}

export function formatThesisReference(fields: ThesisFields): string {
  const author = normalizeWhitespace(fields.author)
  const year = normalizeWhitespace(fields.year)
  const title = stripTrailingPeriod(normalizeWhitespace(fields.title))
  const workType = normalizeWhitespace(fields.workType)
  const institution = normalizeWhitespace(fields.institution)
  const url = normalizeWhitespace(fields.url)

  const bracket = [workType, institution].filter((part) => part !== '').join(', ')
  const titleWithBracket = bracket ? `${title} [${bracket}]` : title
  const base = `${author} (${year}). ${ensureTrailingPeriod(titleWithBracket)}`

  return url ? `${base} ${url}` : base
}

/** Validates and formats in one step, matching the ok/invalid result pattern used elsewhere in NotaLab. */
export function generateReference(input: ReferenceInput): ReferenceResult {
  switch (input.type) {
    case 'book': {
      const errors = validateBookFields(input.fields)
      if (Object.keys(errors).length > 0) return { status: 'invalid', errors }
      return { status: 'ok', reference: formatBookReference(input.fields) }
    }
    case 'website': {
      const errors = validateWebsiteFields(input.fields)
      if (Object.keys(errors).length > 0) return { status: 'invalid', errors }
      return { status: 'ok', reference: formatWebsiteReference(input.fields) }
    }
    case 'article': {
      const errors = validateArticleFields(input.fields)
      if (Object.keys(errors).length > 0) return { status: 'invalid', errors }
      return { status: 'ok', reference: formatArticleReference(input.fields) }
    }
    case 'thesis': {
      const errors = validateThesisFields(input.fields)
      if (Object.keys(errors).length > 0) return { status: 'invalid', errors }
      return { status: 'ok', reference: formatThesisReference(input.fields) }
    }
  }
}

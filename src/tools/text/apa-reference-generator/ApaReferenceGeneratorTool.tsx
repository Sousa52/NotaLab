import { useId, useState } from 'react'
import { Check, Copy, Quote } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import {
  SOURCE_TYPES,
  generateReference,
  type ArticleFields,
  type BookFields,
  type ReferenceInput,
  type SourceTypeId,
  type ThesisFields,
  type WebsiteFields,
} from './calculate'

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
}

/** Mirrors Field's visual language for a native <select>; kept local since only a few tools need it. */
function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const selectId = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-ink-800">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const EMPTY_BOOK: BookFields = { author: '', year: '', title: '', publisher: '' }
const EMPTY_WEBSITE: WebsiteFields = { author: '', year: '', pageTitle: '', siteName: '', url: '' }
const EMPTY_ARTICLE: ArticleFields = {
  author: '',
  year: '',
  articleTitle: '',
  journalName: '',
  volume: '',
  issue: '',
  pages: '',
  doiOrUrl: '',
}
const EMPTY_THESIS: ThesisFields = { author: '', year: '', title: '', workType: '', institution: '', url: '' }
const NO_ERRORS: Record<string, string> = {}

function hasAnyValue<T extends object>(fields: T): boolean {
  for (const key in fields) {
    const value = fields[key]
    if (typeof value === 'string' && value.trim() !== '') return true
  }
  return false
}

export function ApaReferenceGeneratorTool() {
  const t = useI18n()
  const [sourceType, setSourceType] = useState<SourceTypeId>('book')
  const [book, setBook] = useState<BookFields>(EMPTY_BOOK)
  const [website, setWebsite] = useState<WebsiteFields>(EMPTY_WEBSITE)
  const [article, setArticle] = useState<ArticleFields>(EMPTY_ARTICLE)
  const [thesis, setThesis] = useState<ThesisFields>(EMPTY_THESIS)
  const [copied, setCopied] = useState(false)

  const input: ReferenceInput =
    sourceType === 'book'
      ? { type: 'book', fields: book }
      : sourceType === 'website'
        ? { type: 'website', fields: website }
        : sourceType === 'article'
          ? { type: 'article', fields: article }
          : { type: 'thesis', fields: thesis }

  const hasStarted = hasAnyValue(input.fields)
  const result = generateReference(input)
  const errors = result.status === 'invalid' && hasStarted ? result.errors : NO_ERRORS

  async function handleCopy() {
    if (result.status !== 'ok') return
    try {
      await navigator.clipboard.writeText(result.reference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can fail (permissions, insecure context). Fail silently; the
      // reference is still visible and selectable in the result area as a fallback.
    }
  }

  function handleSourceTypeChange(next: SourceTypeId) {
    setSourceType(next)
    setCopied(false)
  }

  return (
    <div className="space-y-6">
      <SelectField
        label={t.apaGenerator.sourceTypeLabel}
        value={sourceType}
        onChange={(value) => handleSourceTypeChange(value as SourceTypeId)}
        options={SOURCE_TYPES}
      />

      {sourceType === 'book' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.apaGenerator.authorLabel}
            placeholder={t.apaGenerator.authorPlaceholder}
            value={book.author}
            onChange={(e) => setBook({ ...book, author: e.target.value })}
            error={errors.author}
          />
          <Field
            label={t.apaGenerator.yearLabel}
            inputMode="numeric"
            placeholder={t.apaGenerator.yearPlaceholder}
            value={book.year}
            onChange={(e) => setBook({ ...book, year: e.target.value })}
            error={errors.year}
          />
          <Field
            label={t.apaGenerator.bookTitleLabel}
            placeholder={t.apaGenerator.bookTitlePlaceholder}
            value={book.title}
            onChange={(e) => setBook({ ...book, title: e.target.value })}
            error={errors.title}
            className="sm:col-span-2"
          />
          <Field
            label={t.apaGenerator.publisherLabel}
            placeholder={t.apaGenerator.publisherPlaceholder}
            value={book.publisher}
            onChange={(e) => setBook({ ...book, publisher: e.target.value })}
            error={errors.publisher}
            className="sm:col-span-2"
          />
        </div>
      )}

      {sourceType === 'website' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.apaGenerator.websiteAuthorLabel}
            placeholder={t.apaGenerator.websiteAuthorPlaceholder}
            value={website.author}
            onChange={(e) => setWebsite({ ...website, author: e.target.value })}
            error={errors.author}
          />
          <Field
            label={t.apaGenerator.yearLabel}
            inputMode="numeric"
            placeholder={t.apaGenerator.yearPlaceholder}
            value={website.year}
            onChange={(e) => setWebsite({ ...website, year: e.target.value })}
            error={errors.year}
          />
          <Field
            label={t.apaGenerator.websiteTitleLabel}
            placeholder={t.apaGenerator.websiteTitlePlaceholder}
            value={website.pageTitle}
            onChange={(e) => setWebsite({ ...website, pageTitle: e.target.value })}
            error={errors.pageTitle}
            className="sm:col-span-2"
          />
          <Field
            label={t.apaGenerator.siteNameLabel}
            placeholder={t.apaGenerator.siteNamePlaceholder}
            value={website.siteName}
            onChange={(e) => setWebsite({ ...website, siteName: e.target.value })}
            error={errors.siteName}
          />
          <Field
            label={t.apaGenerator.urlLabel}
            inputMode="url"
            placeholder={t.apaGenerator.urlPlaceholder}
            value={website.url}
            onChange={(e) => setWebsite({ ...website, url: e.target.value })}
            error={errors.url}
          />
        </div>
      )}

      {sourceType === 'article' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.apaGenerator.authorLabel}
            placeholder={t.apaGenerator.authorPlaceholder}
            value={article.author}
            onChange={(e) => setArticle({ ...article, author: e.target.value })}
            error={errors.author}
          />
          <Field
            label={t.apaGenerator.yearLabel}
            inputMode="numeric"
            placeholder={t.apaGenerator.yearPlaceholder}
            value={article.year}
            onChange={(e) => setArticle({ ...article, year: e.target.value })}
            error={errors.year}
          />
          <Field
            label={t.apaGenerator.articleTitleLabel}
            placeholder={t.apaGenerator.articleTitlePlaceholder}
            value={article.articleTitle}
            onChange={(e) => setArticle({ ...article, articleTitle: e.target.value })}
            error={errors.articleTitle}
            className="sm:col-span-2"
          />
          <Field
            label={t.apaGenerator.journalNameLabel}
            placeholder={t.apaGenerator.journalNamePlaceholder}
            value={article.journalName}
            onChange={(e) => setArticle({ ...article, journalName: e.target.value })}
            error={errors.journalName}
            className="sm:col-span-2"
          />
          <Field
            label={t.apaGenerator.volumeLabel}
            placeholder={t.apaGenerator.volumePlaceholder}
            value={article.volume}
            onChange={(e) => setArticle({ ...article, volume: e.target.value })}
            hint={t.apaGenerator.optionalHint}
          />
          <Field
            label={t.apaGenerator.issueLabel}
            placeholder={t.apaGenerator.issuePlaceholder}
            value={article.issue}
            onChange={(e) => setArticle({ ...article, issue: e.target.value })}
            hint={t.apaGenerator.optionalHint}
          />
          <Field
            label={t.apaGenerator.pagesLabel}
            placeholder={t.apaGenerator.pagesPlaceholder}
            value={article.pages}
            onChange={(e) => setArticle({ ...article, pages: e.target.value })}
            hint={t.apaGenerator.optionalHint}
          />
          <Field
            label={t.apaGenerator.doiOrUrlLabel}
            placeholder={t.apaGenerator.doiOrUrlPlaceholder}
            value={article.doiOrUrl}
            onChange={(e) => setArticle({ ...article, doiOrUrl: e.target.value })}
            hint={t.apaGenerator.optionalHint}
          />
        </div>
      )}

      {sourceType === 'thesis' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.apaGenerator.authorLabel}
            placeholder={t.apaGenerator.authorPlaceholder}
            value={thesis.author}
            onChange={(e) => setThesis({ ...thesis, author: e.target.value })}
            error={errors.author}
          />
          <Field
            label={t.apaGenerator.yearLabel}
            inputMode="numeric"
            placeholder={t.apaGenerator.yearPlaceholder}
            value={thesis.year}
            onChange={(e) => setThesis({ ...thesis, year: e.target.value })}
            error={errors.year}
          />
          <Field
            label={t.apaGenerator.thesisTitleLabel}
            placeholder={t.apaGenerator.thesisTitlePlaceholder}
            value={thesis.title}
            onChange={(e) => setThesis({ ...thesis, title: e.target.value })}
            error={errors.title}
            className="sm:col-span-2"
          />
          <Field
            label={t.apaGenerator.workTypeLabel}
            placeholder={t.apaGenerator.workTypePlaceholder}
            value={thesis.workType}
            onChange={(e) => setThesis({ ...thesis, workType: e.target.value })}
            error={errors.workType}
          />
          <Field
            label={t.apaGenerator.institutionLabel}
            placeholder={t.apaGenerator.institutionPlaceholder}
            value={thesis.institution}
            onChange={(e) => setThesis({ ...thesis, institution: e.target.value })}
            error={errors.institution}
          />
          <Field
            label={t.apaGenerator.urlLabel}
            inputMode="url"
            placeholder={t.apaGenerator.urlPlaceholder}
            value={thesis.url}
            onChange={(e) => setThesis({ ...thesis, url: e.target.value })}
            hint={t.apaGenerator.optionalHint}
            className="sm:col-span-2"
          />
        </div>
      )}

      <div aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-6">
        {!hasStarted && <p className="text-sm text-ink-600">{t.apaGenerator.emptyState}</p>}

        {hasStarted && result.status === 'invalid' && (
          <p className="text-sm font-medium text-red-700">{t.apaGenerator.incompleteState}</p>
        )}

        {hasStarted && result.status === 'ok' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <p className="text-sm font-medium text-ink-600">{t.apaGenerator.resultLabel}</p>
            </div>
            <p className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-950">
              {result.reference}
            </p>
            <Button type="button" variant="secondary" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? t.apaGenerator.copied : t.apaGenerator.copy}
            </Button>
          </div>
        )}
      </div>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {t.apaGenerator.disclaimer}
      </p>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.apaGenerator.howItWorks}</p>
      </div>
    </div>
  )
}

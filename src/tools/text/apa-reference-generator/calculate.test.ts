import { describe, expect, it } from 'vitest'
import {
  formatArticleReference,
  formatBookReference,
  formatThesisReference,
  formatWebsiteReference,
  generateReference,
  normalizeWhitespace,
  validateArticleFields,
  validateBookFields,
  validateThesisFields,
  validateWebsiteFields,
  type ArticleFields,
  type BookFields,
  type ThesisFields,
  type WebsiteFields,
} from './calculate'

function bookFields(overrides: Partial<BookFields> = {}): BookFields {
  return {
    author: 'Silva, J.',
    year: '2020',
    title: 'O grande livro',
    publisher: 'Porto Editora',
    ...overrides,
  }
}

function websiteFields(overrides: Partial<WebsiteFields> = {}): WebsiteFields {
  return {
    author: 'BBC News',
    year: '2023',
    pageTitle: 'Título do artigo',
    siteName: 'BBC',
    url: 'https://bbc.com/article',
    ...overrides,
  }
}

function articleFields(overrides: Partial<ArticleFields> = {}): ArticleFields {
  return {
    author: 'Costa, M.',
    year: '2019',
    articleTitle: 'Um estudo relevante',
    journalName: 'Revista X',
    volume: '12',
    issue: '3',
    pages: '45-67',
    doiOrUrl: 'https://doi.org/10.1/xyz',
    ...overrides,
  }
}

function thesisFields(overrides: Partial<ThesisFields> = {}): ThesisFields {
  return {
    author: 'Santos, A.',
    year: '2021',
    title: 'Título da tese',
    workType: 'Dissertação de mestrado',
    institution: 'Universidade de Lisboa',
    url: 'https://repositorio.pt/tese',
    ...overrides,
  }
}

describe('normalizeWhitespace', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeWhitespace('  Silva,   J.  ')).toBe('Silva, J.')
  })

  it('leaves already-clean text untouched', () => {
    expect(normalizeWhitespace('Educação e Ciência')).toBe('Educação e Ciência')
  })
})

describe('formatBookReference', () => {
  it('generates a book reference', () => {
    expect(formatBookReference(bookFields())).toBe('Silva, J. (2020). O grande livro. Porto Editora.')
  })

  it('preserves a trailing period on the author (e.g. an initial) instead of stripping it', () => {
    expect(formatBookReference(bookFields({ author: 'Silva, J. A.' }))).toBe(
      'Silva, J. A. (2020). O grande livro. Porto Editora.',
    )
  })

  it('does not double up punctuation when the title or publisher already end with a period', () => {
    const withPeriods = formatBookReference(
      bookFields({ title: 'O grande livro.', publisher: 'Porto Editora.' }),
    )
    expect(withPeriods).toBe('Silva, J. (2020). O grande livro. Porto Editora.')
  })

  it('trims whitespace from every field', () => {
    const result = formatBookReference(
      bookFields({ author: '  Silva, J.  ', title: '  O   grande livro  ', publisher: '  Porto Editora  ' }),
    )
    expect(result).toBe('Silva, J. (2020). O grande livro. Porto Editora.')
  })

  it('preserves special Portuguese characters', () => {
    const result = formatBookReference(bookFields({ title: 'Educação, Ciência e Inovação' }))
    expect(result).toContain('Educação, Ciência e Inovação')
  })
})

describe('formatWebsiteReference', () => {
  it('generates a website reference', () => {
    expect(formatWebsiteReference(websiteFields())).toBe(
      'BBC News (2023). Título do artigo. BBC. https://bbc.com/article',
    )
  })

  it('does not double up punctuation when the site name already ends with a period', () => {
    const result = formatWebsiteReference(websiteFields({ siteName: 'BBC.' }))
    expect(result).toBe('BBC News (2023). Título do artigo. BBC. https://bbc.com/article')
  })
})

describe('formatArticleReference', () => {
  it('generates a full article reference with volume, issue, pages and a DOI', () => {
    expect(formatArticleReference(articleFields())).toBe(
      'Costa, M. (2019). Um estudo relevante. Revista X, 12(3), 45-67. https://doi.org/10.1/xyz',
    )
  })

  it('omits the DOI/URL segment entirely when it is missing (optional field)', () => {
    const result = formatArticleReference(articleFields({ doiOrUrl: '' }))
    expect(result).toBe('Costa, M. (2019). Um estudo relevante. Revista X, 12(3), 45-67.')
    expect(result.endsWith('67.')).toBe(true)
  })

  it('formats volume without an issue', () => {
    const result = formatArticleReference(articleFields({ issue: '' }))
    expect(result).toContain('Revista X, 12, 45-67.')
  })

  it('omits volume/issue/pages cleanly when only the journal name is given', () => {
    const result = formatArticleReference(
      articleFields({ volume: '', issue: '', pages: '', doiOrUrl: '' }),
    )
    expect(result).toBe('Costa, M. (2019). Um estudo relevante. Revista X.')
  })

  it('does not leave a dangling comma when pages are missing but volume/issue are present', () => {
    const result = formatArticleReference(articleFields({ pages: '', doiOrUrl: '' }))
    expect(result).toBe('Costa, M. (2019). Um estudo relevante. Revista X, 12(3).')
  })
})

describe('formatThesisReference', () => {
  it('generates a thesis reference with the work type and institution bracketed', () => {
    expect(formatThesisReference(thesisFields())).toBe(
      'Santos, A. (2021). Título da tese [Dissertação de mestrado, Universidade de Lisboa]. https://repositorio.pt/tese',
    )
  })

  it('omits the trailing URL when it is missing (optional field)', () => {
    const result = formatThesisReference(thesisFields({ url: '' }))
    expect(result).toBe(
      'Santos, A. (2021). Título da tese [Dissertação de mestrado, Universidade de Lisboa].',
    )
  })
})

describe('validateBookFields', () => {
  it('requires author, year, title and publisher', () => {
    const errors = validateBookFields(bookFields({ author: '', title: '', publisher: '' }))
    expect(errors.author).toBeDefined()
    expect(errors.title).toBeDefined()
    expect(errors.publisher).toBeDefined()
    expect(errors.year).toBeUndefined()
  })

  it('rejects a malformed year', () => {
    expect(validateBookFields(bookFields({ year: 'abcd' })).year).toBeDefined()
    expect(validateBookFields(bookFields({ year: '999' })).year).toBeDefined()
    expect(validateBookFields(bookFields({ year: '20205' })).year).toBeDefined()
  })

  it('accepts a valid 4-digit year', () => {
    expect(validateBookFields(bookFields({ year: '2024' })).year).toBeUndefined()
  })

  it('returns no errors for fully valid fields', () => {
    expect(validateBookFields(bookFields())).toEqual({})
  })

  it('treats whitespace-only input as empty', () => {
    expect(validateBookFields(bookFields({ author: '   ' })).author).toBeDefined()
  })
})

describe('validateWebsiteFields', () => {
  it('requires the URL (not marked optional for this source type)', () => {
    expect(validateWebsiteFields(websiteFields({ url: '' })).url).toBeDefined()
  })

  it('returns no errors for fully valid fields', () => {
    expect(validateWebsiteFields(websiteFields())).toEqual({})
  })
})

describe('validateArticleFields', () => {
  it('requires author, year, title and journal name', () => {
    const errors = validateArticleFields(articleFields({ author: '', articleTitle: '', journalName: '' }))
    expect(errors.author).toBeDefined()
    expect(errors.articleTitle).toBeDefined()
    expect(errors.journalName).toBeDefined()
  })

  it('does not require volume, issue, pages or doiOrUrl', () => {
    const errors = validateArticleFields(
      articleFields({ volume: '', issue: '', pages: '', doiOrUrl: '' }),
    )
    expect(errors).toEqual({})
  })
})

describe('validateThesisFields', () => {
  it('requires work type and institution', () => {
    const errors = validateThesisFields(thesisFields({ workType: '', institution: '' }))
    expect(errors.workType).toBeDefined()
    expect(errors.institution).toBeDefined()
  })

  it('does not require the URL', () => {
    expect(validateThesisFields(thesisFields({ url: '' }))).toEqual({})
  })
})

describe('generateReference', () => {
  it('returns an "ok" result with the formatted reference for valid input', () => {
    const result = generateReference({ type: 'book', fields: bookFields() })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.reference).toBe(formatBookReference(bookFields()))
    }
  })

  it('returns an "invalid" result with field errors when required fields are missing', () => {
    const result = generateReference({ type: 'book', fields: bookFields({ author: '' }) })
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') {
      expect(result.errors.author).toBeDefined()
    }
  })

  it('works for all four source types', () => {
    expect(generateReference({ type: 'book', fields: bookFields() }).status).toBe('ok')
    expect(generateReference({ type: 'website', fields: websiteFields() }).status).toBe('ok')
    expect(generateReference({ type: 'article', fields: articleFields() }).status).toBe('ok')
    expect(generateReference({ type: 'thesis', fields: thesisFields() }).status).toBe('ok')
  })
})

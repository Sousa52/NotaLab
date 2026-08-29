import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Container } from '../components/Container'
import { Seo } from '../components/Seo'
import { ToolCard } from '../components/ToolCard'
import { categories, getCategory } from '../data/categories'
import { tools } from '../data/tools'
import { searchTools } from '../lib/searchTools'
import { cn } from '../lib/cn'
import { useI18n } from '../i18n'
import type { ToolCategory } from '../types/tool'

export function ToolsDirectory() {
  const t = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') ?? ''
  const categoryParam = searchParams.get('categoria') as ToolCategory | null
  const activeCategory = categoryParam && getCategory(categoryParam) ? categoryParam : null

  const results = useMemo(
    () => searchTools(tools, { query, category: activeCategory }),
    [query, activeCategory],
  )

  function updateParams(next: { q?: string; categoria?: string | null }) {
    const params = new URLSearchParams(searchParams)

    if (next.q !== undefined) {
      if (next.q) params.set('q', next.q)
      else params.delete('q')
    }

    if (next.categoria !== undefined) {
      if (next.categoria) params.set('categoria', next.categoria)
      else params.delete('categoria')
    }

    setSearchParams(params, { replace: true })
  }

  const hasAnyTools = tools.some((tool) => !tool.meta.draft)
  const hasActiveFilters = Boolean(query || activeCategory)

  return (
    <>
      <Seo title={t.directory.title} description={t.directory.subtitle} path="/ferramentas" />

      <Container className="py-14">
        <header>
          <h1 className="text-2xl font-semibold text-ink-950 sm:text-3xl">{t.directory.title}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-600">{t.directory.subtitle}</p>
        </header>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form role="search" className="relative w-full max-w-md" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="directory-search" className="sr-only">
              {t.common.search}
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              id="directory-search"
              type="search"
              value={query}
              onChange={(e) => updateParams({ q: e.target.value })}
              placeholder={t.common.searchPlaceholder}
              className="w-full rounded-md border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-950 placeholder:text-ink-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            />
            {query && (
              <button
                type="button"
                onClick={() => updateParams({ q: '' })}
                aria-label="Limpar pesquisa"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </form>

          {hasAnyTools && (
            <p className="text-sm text-ink-600" aria-live="polite">
              {t.directory.resultsCount(results.length)}
            </p>
          )}
        </div>

        <nav aria-label="Filtrar por categoria" className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateParams({ categoria: null })}
            aria-pressed={!activeCategory}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              !activeCategory
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-brand-500 hover:text-brand-700',
            )}
          >
            {t.directory.allCategories}
          </button>
          {categories.map((category) => {
            const isActive = activeCategory === category.slug
            return (
              <button
                key={category.slug}
                type="button"
                onClick={() => updateParams({ categoria: isActive ? null : category.slug })}
                aria-pressed={isActive}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-brand-500 hover:text-brand-700',
                )}
              >
                {category.name}
              </button>
            )
          })}
        </nav>

        <div className="mt-8">
          {!hasAnyTools ? (
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-8 text-center sm:p-12">
              <h2 className="text-base font-semibold text-ink-950">{t.directory.comingSoonTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">{t.directory.comingSoonBody}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-8 text-center sm:p-12">
              <p className="text-sm text-ink-600">{t.common.noResults}</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => updateParams({ q: '', categoria: null })}
                  className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {t.common.clear}
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((tool) => (
                <ToolCard key={tool.meta.slug} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </>
  )
}

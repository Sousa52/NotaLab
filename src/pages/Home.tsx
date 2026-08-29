import { Link } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Container } from '../components/Container'
import { Seo } from '../components/Seo'
import { ToolCard } from '../components/ToolCard'
import { categories } from '../data/categories'
import { tools } from '../data/tools'
import { useI18n } from '../i18n'

export function Home() {
  const t = useI18n()
  const [query, setQuery] = useState('')
  const popularTools = tools.filter((tool) => !tool.meta.draft).slice(0, 6)

  return (
    <>
      <Seo
        title="NotaLab"
        description="Calculadoras académicas, ferramentas de estudo e conversores de ficheiros para estudantes. Gratuito e sem conta necessária."
        path="/"
      />

      <section className="border-b border-ink-200 bg-ink-50">
        <Container className="py-16 sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">NotaLab</h1>
          <p className="mt-2 max-w-xl text-lg text-ink-800">{t.home.tagline}</p>
          <p className="mt-3 max-w-xl text-sm text-ink-600">{t.home.subtitle}</p>

          <form
            role="search"
            className="relative mt-8 max-w-md"
            onSubmit={(e) => {
              e.preventDefault()
              window.location.href = `/ferramentas${query ? `?q=${encodeURIComponent(query)}` : ''}`
            }}
          >
            <label htmlFor="home-search" className="sr-only">
              {t.common.search}
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="home-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.common.searchPlaceholder}
              className="w-full rounded-md border border-ink-200 bg-white py-3 pl-10 pr-4 text-sm text-ink-950 shadow-sm placeholder:text-ink-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            />
          </form>
        </Container>
      </section>

      <section aria-labelledby="categories-heading">
        <Container className="py-14">
          <h2 id="categories-heading" className="text-lg font-semibold text-ink-950">
            {t.common.categories}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Link
                  key={category.slug}
                  to={`/ferramentas?categoria=${category.slug}`}
                  className="group rounded-lg border border-ink-200 p-5 transition-colors hover:border-brand-500 hover:bg-brand-50"
                >
                  <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
                  <h3 className="mt-3 font-medium text-ink-950">{category.name}</h3>
                  <p className="mt-1 text-sm text-ink-600">{category.description}</p>
                </Link>
              )
            })}
          </div>
        </Container>
      </section>

      {popularTools.length > 0 && (
        <section aria-labelledby="popular-heading" className="border-t border-ink-200 bg-ink-50">
          <Container className="py-14">
            <div className="flex items-center justify-between">
              <h2 id="popular-heading" className="text-lg font-semibold text-ink-950">
                {t.home.popularTools}
              </h2>
              <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                {t.home.browseAll}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popularTools.map((tool) => (
                <ToolCard key={tool.meta.slug} tool={tool} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  )
}

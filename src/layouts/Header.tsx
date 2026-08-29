import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Search, NotebookPen } from 'lucide-react'
import { Container } from '../components/Container'
import { useI18n } from '../i18n'

export function Header() {
  const t = useI18n()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    navigate(`/ferramentas${query ? `?q=${encodeURIComponent(query)}` : ''}`)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-ink-950">
          <NotebookPen className="h-5 w-5 text-brand-600" aria-hidden="true" />
          <span>NotaLab</span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-6 text-sm font-medium text-ink-600 sm:flex">
          <Link to="/ferramentas" className="hover:text-ink-950">
            {t.nav.tools}
          </Link>
        </nav>

        <form onSubmit={handleSubmit} role="search" className="relative w-full max-w-xs">
          <label htmlFor="site-search" className="sr-only">
            {t.common.search}
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            id="site-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.searchPlaceholder}
            className="w-full rounded-md border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-sm text-ink-950 placeholder:text-ink-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          />
        </form>
      </Container>
    </header>
  )
}

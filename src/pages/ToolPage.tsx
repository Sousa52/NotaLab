import { useParams, Link, Navigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Container } from '../components/Container'
import { Seo } from '../components/Seo'
import { ToolCard } from '../components/ToolCard'
import { getToolBySlug } from '../data/tools'
import { getCategory } from '../data/categories'
import { useI18n } from '../i18n'

export function ToolPage() {
  const { slug } = useParams()
  const t = useI18n()
  const tool = slug ? getToolBySlug(slug) : undefined

  if (!tool) {
    return <Navigate to="/ferramentas" replace />
  }

  const category = getCategory(tool.meta.category)
  const related = (tool.meta.relatedSlugs ?? [])
    .map((relatedSlug) => getToolBySlug(relatedSlug))
    .filter((relatedTool): relatedTool is NonNullable<typeof relatedTool> => Boolean(relatedTool))

  const Icon = tool.meta.icon
  const Component = tool.Component

  return (
    <>
      <Seo
        title={tool.meta.name}
        description={tool.meta.description}
        path={`/ferramentas/${tool.meta.slug}`}
      />

      <Container className="py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
          <Link to="/" className="hover:text-ink-800">
            {t.common.home}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link to="/ferramentas" className="hover:text-ink-800">
            {t.nav.tools}
          </Link>
          {category && (
            <>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link to={`/ferramentas?categoria=${category.slug}`} className="hover:text-ink-800">
                {category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-ink-800" aria-current="page">
            {tool.meta.name}
          </span>
        </nav>

        <header className="mt-4 max-w-2xl">
          <Icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-semibold text-ink-950 sm:text-3xl">{tool.meta.name}</h1>
          <p className="mt-2 text-sm text-ink-600">{tool.meta.description}</p>
        </header>

        <div className="mt-8 max-w-2xl">
          <Component />
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-14 border-t border-ink-200 pt-10">
            <h2 id="related-heading" className="text-lg font-semibold text-ink-950">
              {t.common.relatedTools}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((relatedTool) => (
                <ToolCard key={relatedTool.meta.slug} tool={relatedTool} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  )
}

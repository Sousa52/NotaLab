import { Link } from 'react-router-dom'
import type { ToolDefinition } from '../types/tool'
import { getCategory } from '../data/categories'

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.meta.icon
  const category = getCategory(tool.meta.category)

  return (
    <Link
      to={`/ferramentas/${tool.meta.slug}`}
      className="group rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-brand-500 hover:bg-brand-50"
    >
      <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
      <h3 className="mt-3 font-medium text-ink-950">{tool.meta.name}</h3>
      <p className="mt-1 text-sm text-ink-600">{tool.meta.shortDescription}</p>
      {category && <p className="mt-3 text-xs font-medium text-ink-400">{category.name}</p>}
    </Link>
  )
}

import type { ToolCategory, ToolDefinition } from '../types/tool'

export function searchTools(
  tools: ToolDefinition[],
  { query, category }: { query?: string; category?: ToolCategory | null },
) {
  let result = tools.filter((t) => !t.meta.draft)

  if (category) {
    result = result.filter((t) => t.meta.category === category)
  }

  const normalizedQuery = query?.trim().toLowerCase()
  if (normalizedQuery) {
    result = result.filter((t) => {
      const haystack = [t.meta.name, t.meta.shortDescription, ...t.meta.keywords]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }

  return result
}

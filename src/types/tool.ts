import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ToolCategory =
  | 'academico'
  | 'estudo'
  | 'calculadoras'
  | 'ficheiros'
  | 'texto'
  | 'outros'

export interface ToolMeta {
  /** Unique slug used in the route, e.g. "calculadora-media" */
  slug: string
  category: ToolCategory
  name: string
  shortDescription: string
  /** Longer explanation used on the tool page and for SEO */
  description: string
  icon: LucideIcon
  keywords: string[]
  /** Slugs of related tools to cross-link */
  relatedSlugs?: string[]
  /** Hide from directory/search while still under development */
  draft?: boolean
}

export interface ToolDefinition {
  meta: ToolMeta
  Component: ComponentType
}

export interface CategoryMeta {
  slug: ToolCategory
  name: string
  description: string
  icon: LucideIcon
}

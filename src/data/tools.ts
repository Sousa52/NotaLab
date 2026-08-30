import type { ToolDefinition } from '../types/tool'
import { weightedAverageTool } from '../tools/academic/weighted-average'
import { requiredGradeTool } from '../tools/academic/required-grade'
import { degreeAverageTool } from '../tools/academic/degree-average'

/**
 * Central registry of every tool available on the platform.
 * Each tool is added here once its folder under src/tools/<category>/ exists.
 * See docs/adding-a-tool.md for the process.
 */
export const tools: ToolDefinition[] = [weightedAverageTool, requiredGradeTool, degreeAverageTool]

export function getToolBySlug(slug: string) {
  return tools.find((t) => t.meta.slug === slug)
}

export function getToolsByCategory(category: string) {
  return tools.filter((t) => t.meta.category === category && !t.meta.draft)
}

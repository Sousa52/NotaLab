import type { ToolDefinition } from '../types/tool'
import { weightedAverageTool } from '../tools/academic/weighted-average'
import { requiredGradeTool } from '../tools/academic/required-grade'
import { degreeAverageTool } from '../tools/academic/degree-average'
import { wordCounterTool } from '../tools/text/word-counter'
import { pomodoroTool } from '../tools/study/pomodoro'
import { unitConverterTool } from '../tools/calculators/unit-converter'
import { gradeConverterTool } from '../tools/calculators/grade-converter'
import { studySessionPlannerTool } from '../tools/study/study-session-planner'
import { examCountdownTool } from '../tools/study/exam-countdown'
import { apaReferenceGeneratorTool } from '../tools/text/apa-reference-generator'
import { scientificCalculatorTool } from '../tools/calculators/scientific-calculator'

/**
 * Central registry of every tool available on the platform.
 * Each tool is added here once its folder under src/tools/<category>/ exists.
 * See docs/adding-a-tool.md for the process.
 */
export const tools: ToolDefinition[] = [
  weightedAverageTool,
  requiredGradeTool,
  degreeAverageTool,
  wordCounterTool,
  pomodoroTool,
  unitConverterTool,
  gradeConverterTool,
  studySessionPlannerTool,
  examCountdownTool,
  apaReferenceGeneratorTool,
  scientificCalculatorTool,
]

export function getToolBySlug(slug: string) {
  return tools.find((t) => t.meta.slug === slug)
}

export function getToolsByCategory(category: string) {
  return tools.filter((t) => t.meta.category === category && !t.meta.draft)
}

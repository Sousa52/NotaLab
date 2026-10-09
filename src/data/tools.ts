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
import { percentageCalculatorTool } from '../tools/calculators/percentage-calculator'
import { interestCalculatorTool } from '../tools/calculators/interest-calculator'
import { ruleOfThreeTool } from '../tools/calculators/rule-of-three'
import { dateDifferenceTool } from '../tools/calculators/date-difference'
import { discountCalculatorTool } from '../tools/calculators/desconto'
import { ectsAverageTool } from '../tools/academic/ects-average'
import { vatCalculatorTool } from '../tools/calculators/vat-calculator'
import { salaryCalculatorTool } from '../tools/calculators/salary-calculator'
import { compoundInterestTool } from '../tools/calculators/compound-interest'
import { loanRepaymentTool } from '../tools/calculators/loan-repayment'
import { jpgToPngTool } from '../tools/converters/jpg-to-png'
import { pngToJpgTool } from '../tools/converters/png-to-jpg'
import { webpToPngTool } from '../tools/converters/webp-to-png'
import { svgToPngTool } from '../tools/converters/svg-to-png'
import { gifToPngTool } from '../tools/converters/gif-to-png'
import { imagesToPdfTool } from '../tools/converters/images-to-pdf'
import { pdfToJpgTool } from '../tools/converters/pdf-to-jpg'

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
  percentageCalculatorTool,
  interestCalculatorTool,
  ruleOfThreeTool,
  dateDifferenceTool,
  discountCalculatorTool,
  ectsAverageTool,
  vatCalculatorTool,
  salaryCalculatorTool,
  compoundInterestTool,
  loanRepaymentTool,
  jpgToPngTool,
  pngToJpgTool,
  webpToPngTool,
  svgToPngTool,
  gifToPngTool,
  imagesToPdfTool,
  pdfToJpgTool,
]

export function getToolBySlug(slug: string) {
  return tools.find((t) => t.meta.slug === slug)
}

export function getToolsByCategory(category: string) {
  return tools.filter((t) => t.meta.category === category && !t.meta.draft)
}

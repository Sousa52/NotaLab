import { GraduationCap } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { DegreeAverageTool } from './DegreeAverageTool'

export const degreeAverageTool: ToolDefinition = {
  meta: {
    slug: 'calculadora-media-licenciatura',
    category: 'academico',
    name: 'Calculadora de média da licenciatura',
    shortDescription: 'Calcula a média simples e a média ponderada por ECTS do teu curso.',
    description:
      'Calcula a média das unidades curriculares da tua licenciatura, tanto em média simples como em média ponderada por ECTS. Serve como referência geral — as regras oficiais de classificação podem variar entre instituições.',
    icon: GraduationCap,
    keywords: ['ects', 'licenciatura', 'média do curso', 'unidades curriculares'],
    relatedSlugs: ['calculadora-media', 'que-nota-preciso'],
  },
  Component: DegreeAverageTool,
}

import { Library } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { EctsAverageTool } from './EctsAverageTool'

export const ectsAverageTool: ToolDefinition = {
  meta: {
    slug: 'media-por-ects',
    category: 'academico',
    name: 'Calculadora de média por ECTS',
    shortDescription: 'Calcula a média ponderada pelos ECTS das tuas unidades curriculares.',
    description:
      'Adiciona as tuas unidades curriculares com a nota e os ECTS de cada uma e obtém a média ponderada pelos ECTS, o total de ECTS considerados e o número de unidades curriculares. Serve como referência geral — as regras oficiais de classificação podem variar entre instituições.',
    icon: Library,
    keywords: [
      'média',
      'média por ects',
      'ects',
      'créditos',
      'cadeiras',
      'unidades curriculares',
      'nota',
      'média ponderada',
      'média do curso',
    ],
    relatedSlugs: ['calculadora-media-licenciatura', 'calculadora-media', 'que-nota-preciso'],
  },
  Component: EctsAverageTool,
}

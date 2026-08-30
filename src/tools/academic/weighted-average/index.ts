import { Percent } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { WeightedAverageTool } from './WeightedAverageTool'

export const weightedAverageTool: ToolDefinition = {
  meta: {
    slug: 'calculadora-media',
    category: 'academico',
    name: 'Calculadora de média ponderada',
    shortDescription: 'Calcula a média final a partir de vários componentes de avaliação.',
    description:
      'Calcula a média ponderada de avaliações, escola secundária ou universidade, na escala de 0 a 20. Adiciona quantos componentes precisares, indica a nota e o peso de cada um, e obtém o resultado final.',
    icon: Percent,
    keywords: ['média', 'ponderada', 'nota final', 'avaliação', 'peso'],
    relatedSlugs: ['que-nota-preciso', 'calculadora-media-licenciatura'],
  },
  Component: WeightedAverageTool,
}

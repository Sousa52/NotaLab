import { Target } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { RequiredGradeTool } from './RequiredGradeTool'

export const requiredGradeTool: ToolDefinition = {
  meta: {
    slug: 'que-nota-preciso',
    category: 'academico',
    name: 'Que nota preciso?',
    shortDescription: 'Calcula a nota que precisas na avaliação que falta para atingir a média que queres.',
    description:
      'Descobre que nota precisas na avaliação que ainda falta (por exemplo, o exame) para atingires a média final pretendida, a partir da nota e do peso que já tens.',
    icon: Target,
    keywords: ['nota necessária', 'exame', 'média final', 'objetivo'],
    relatedSlugs: ['calculadora-media', 'calculadora-media-licenciatura'],
  },
  Component: RequiredGradeTool,
}

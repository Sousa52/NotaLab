import { Scale } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { RuleOfThreeTool } from './RuleOfThreeTool'

export const ruleOfThreeTool: ToolDefinition = {
  meta: {
    slug: 'regra-de-tres',
    category: 'calculadoras',
    name: 'Calculadora de Regra de Três',
    shortDescription: 'Resolve proporções diretas e inversas: A : B = C : X.',
    description:
      'Resolve regras de três simples, diretas ou inversas, a partir de três valores conhecidos. Útil para preços, quantidades, distâncias, receitas, ritmos de trabalho e exercícios escolares. Tudo calculado localmente, no teu navegador.',
    icon: Scale,
    keywords: [
      'regra de três',
      'proporcionalidade direta',
      'proporcionalidade inversa',
      'proporção',
      'razão',
      'produto cruzado',
    ],
    relatedSlugs: ['calculadora-percentagens', 'calculadora-juros', 'calculadora-cientifica'],
  },
  Component: RuleOfThreeTool,
}

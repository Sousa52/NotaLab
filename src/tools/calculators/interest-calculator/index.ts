import { PiggyBank } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { InterestCalculatorTool } from './InterestCalculatorTool'

export const interestCalculatorTool: ToolDefinition = {
  meta: {
    slug: 'calculadora-juros',
    category: 'calculadoras',
    name: 'Calculadora de Juros',
    shortDescription: 'Juros simples e compostos: calcula os juros e o montante final.',
    description:
      'Calcula juros simples e juros compostos a partir do capital inicial, da taxa de juro por período e do número de períodos. Mostra os juros ganhos e o montante final. Tudo calculado localmente, no teu navegador.',
    icon: PiggyBank,
    keywords: [
      'calculadora de juros',
      'juros simples',
      'juros compostos',
      'montante',
      'capital',
      'taxa de juro',
      'investimento',
      'poupança',
    ],
    relatedSlugs: ['calculadora-percentagens', 'calculadora-cientifica', 'conversor-de-notas'],
  },
  Component: InterestCalculatorTool,
}

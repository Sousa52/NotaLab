import { PercentCircle } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { PercentageCalculatorTool } from './PercentageCalculatorTool'

export const percentageCalculatorTool: ToolDefinition = {
  meta: {
    slug: 'calculadora-percentagens',
    category: 'calculadoras',
    name: 'Calculadora de Percentagens',
    shortDescription: 'Percentagem de um número, aumento, diminuição e diferença percentual.',
    description:
      'Calculadora de percentagens com cinco operações comuns: percentagem de um número, que percentagem é um número de outro, aumento percentual, diminuição percentual e diferença percentual entre dois valores. Tudo calculado localmente, no teu navegador.',
    icon: PercentCircle,
    keywords: [
      'calculadora de percentagens',
      'percentagem',
      'aumento percentual',
      'diminuição percentual',
      'diferença percentual',
      'desconto',
      'que percentagem',
    ],
    relatedSlugs: ['conversor-de-notas', 'conversor-de-unidades', 'calculadora-cientifica'],
  },
  Component: PercentageCalculatorTool,
}

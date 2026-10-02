import { TrendingUp } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { CompoundInterestTool } from './CompoundInterestTool'

export const compoundInterestTool: ToolDefinition = {
  meta: {
    slug: 'calculadora-juros-compostos',
    category: 'calculadoras',
    name: 'Calculadora de Juros Compostos',
    shortDescription: 'Simula o crescimento de um investimento com reforços periódicos e juros compostos.',
    description:
      'Simula a evolução de um investimento a partir do capital inicial, de reforços mensais ou anuais, da taxa de juro anual, da duração em anos e da frequência de capitalização. Mostra o saldo final, o total investido, os juros ganhos, a taxa efetiva anual, a divisão entre capital e juros e um gráfico da evolução ano a ano. São apenas estimativas: não incluem impostos, comissões, inflação nem risco. Tudo calculado localmente, no teu navegador.',
    icon: TrendingUp,
    keywords: [
      'juros compostos',
      'calculadora de juros compostos',
      'investimento',
      'poupança',
      'reforço periódico',
      'capital inicial',
      'rendimento',
      'taxa efetiva',
      'simulador de investimento',
      'crescimento do capital',
    ],
    relatedSlugs: ['calculadora-juros', 'calculadora-percentagens', 'calculadora-salario-liquido'],
  },
  Component: CompoundInterestTool,
}

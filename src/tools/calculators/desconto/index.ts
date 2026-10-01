import { BadgePercent } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { DescontoTool } from './DescontoTool'

export const discountCalculatorTool: ToolDefinition = {
  meta: {
    slug: 'desconto',
    category: 'calculadoras',
    name: 'Calculadora de Descontos',
    shortDescription: 'Calcula o valor do desconto, o preço final ou a percentagem de desconto.',
    description:
      'Indica o preço original e a percentagem para ver o valor do desconto e o preço final, ou indica o preço original e o preço final para descobrir a percentagem de desconto efetiva. Útil para saldos, promoções e compras. Tudo calculado localmente, no teu navegador.',
    icon: BadgePercent,
    keywords: [
      'calculadora de descontos',
      'desconto',
      'percentagem de desconto',
      'preço final',
      'preço com desconto',
      'promoção',
      'saldos',
      'quanto poupo',
    ],
    relatedSlugs: ['calculadora-percentagens', 'regra-de-tres', 'calculadora-juros'],
  },
  Component: DescontoTool,
}

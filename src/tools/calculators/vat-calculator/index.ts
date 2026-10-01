import { Receipt } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { VatCalculatorTool } from './VatCalculatorTool'

export const vatCalculatorTool: ToolDefinition = {
  meta: {
    slug: 'calculadora-iva',
    category: 'calculadoras',
    name: 'Calculadora de IVA',
    shortDescription: 'Adiciona ou retira IVA a um valor, com as taxas do continente ou uma taxa personalizada.',
    description:
      'Adiciona IVA a um valor sem IVA ou retira o IVA de um valor com IVA, e vê o valor do IVA, o valor sem IVA e o total. Escolhe uma das taxas do continente de Portugal (6%, 13% ou 23%) ou indica uma taxa personalizada. As taxas aplicáveis podem variar consoante a região, o tipo de bem ou serviço e as circunstâncias legais. Tudo calculado localmente, no teu navegador.',
    icon: Receipt,
    keywords: [
      'iva',
      'calculadora de iva',
      'imposto',
      'taxa',
      'taxa de iva',
      'valor líquido',
      'valor bruto',
      'preço',
      'portugal',
      'adicionar iva',
      'retirar iva',
    ],
    relatedSlugs: ['calculadora-percentagens', 'desconto', 'calculadora-juros'],
  },
  Component: VatCalculatorTool,
}

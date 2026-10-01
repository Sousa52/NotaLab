import { Banknote } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { SalaryCalculatorTool } from './SalaryCalculatorTool'

export const salaryCalculatorTool: ToolDefinition = {
  meta: {
    slug: 'calculadora-salario-liquido',
    category: 'calculadoras',
    name: 'Calculadora de Salário Líquido',
    shortDescription: 'Estima o salário líquido mensal e anual a partir do salário bruto.',
    description:
      'Estima o salário líquido a partir do salário bruto mensal, do número de pagamentos anuais (12 ou 14), da taxa de retenção de IRS que indicares e da taxa de Segurança Social (11% por omissão). Mostra os descontos mensais, o salário líquido mensal e as estimativas anuais. É apenas uma estimativa: não usa tabelas oficiais de IRS nem substitui o recibo de vencimento. Tudo calculado localmente, no teu navegador.',
    icon: Banknote,
    keywords: [
      'salário líquido',
      'salário bruto',
      'calculadora de salário',
      'irs',
      'retenção na fonte',
      'segurança social',
      'vencimento',
      'recibo de vencimento',
      'salário mensal',
    ],
    relatedSlugs: ['calculadora-percentagens', 'calculadora-iva', 'calculadora-juros'],
  },
  Component: SalaryCalculatorTool,
}

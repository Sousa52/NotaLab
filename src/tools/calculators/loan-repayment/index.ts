import { Landmark } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { LoanRepaymentTool } from './LoanRepaymentTool'

export const loanRepaymentTool: ToolDefinition = {
  meta: {
    slug: 'simulador-credito',
    category: 'calculadoras',
    name: 'Simulador de Crédito',
    shortDescription: 'Estima a prestação mensal, os juros e o plano de amortização de um crédito de taxa fixa.',
    description:
      'Indica o montante, a taxa de juro anual nominal e a duração (em anos ou meses), e, se quiseres, uma entrada e um reforço mensal. Vê a prestação mensal contratual, o total de juros e o total pago, quanto tempo e quantos juros poupas com o reforço e o plano de amortização mês a mês. É apenas uma estimativa: não inclui comissões, seguros, impostos nem encargos por reembolso antecipado, e não é uma proposta oficial de nenhum banco. Tudo calculado localmente, no teu navegador.',
    icon: Landmark,
    keywords: [
      'crédito',
      'simulador de crédito',
      'empréstimo',
      'prestação',
      'prestação mensal',
      'amortização',
      'plano de amortização',
      'taxa de juro',
      'entrada',
      'reforço mensal',
      'crédito habitação',
      'crédito pessoal',
    ],
    relatedSlugs: ['calculadora-juros', 'calculadora-juros-compostos', 'calculadora-salario-liquido'],
  },
  Component: LoanRepaymentTool,
}

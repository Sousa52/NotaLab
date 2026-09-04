import { Sigma } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { ScientificCalculatorTool } from './ScientificCalculatorTool'

export const scientificCalculatorTool: ToolDefinition = {
  meta: {
    slug: 'calculadora-cientifica',
    category: 'calculadoras',
    name: 'Calculadora Científica',
    shortDescription: 'Operações básicas, potências, raízes, percentagens e funções trigonométricas.',
    description:
      'Calculadora científica com operações básicas, parênteses, potências e raízes, percentagens, e funções trigonométricas (sin, cos, tan em graus), log e ln. Tudo calculado localmente, com um interpretador de expressões seguro — sem eval nem execução de código arbitrário.',
    icon: Sigma,
    keywords: [
      'calculadora científica',
      'calculadora',
      'trigonometria',
      'seno',
      'cosseno',
      'tangente',
      'raiz quadrada',
      'potências',
      'percentagem',
      'logaritmo',
    ],
    relatedSlugs: ['conversor-de-unidades', 'conversor-de-notas'],
  },
  Component: ScientificCalculatorTool,
}

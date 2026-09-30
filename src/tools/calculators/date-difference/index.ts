import { CalendarRange } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { DateDifferenceTool } from './DateDifferenceTool'

export const dateDifferenceTool: ToolDefinition = {
  meta: {
    slug: 'diferenca-de-datas',
    category: 'calculadoras',
    name: 'Calculadora de Diferença de Datas',
    shortDescription: 'Calcula os dias, as semanas e a diferença de calendário entre duas datas.',
    description:
      'Indica duas datas e vê quantos dias as separam, quantas semanas completas e dias restantes isso representa, e a diferença em anos, meses e dias de calendário. As datas são tratadas como dias de calendário, sem efeito do fuso horário. Tudo calculado localmente, no teu navegador.',
    icon: CalendarRange,
    keywords: [
      'diferença de datas',
      'dias entre datas',
      'calculadora de datas',
      'quantos dias',
      'semanas entre datas',
      'anos meses e dias',
      'intervalo de datas',
    ],
    relatedSlugs: ['contador-para-exame', 'planeador-de-estudo', 'calculadora-percentagens'],
  },
  Component: DateDifferenceTool,
}

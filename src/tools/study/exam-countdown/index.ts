import { Hourglass } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { ExamCountdownTool } from './ExamCountdownTool'

export const examCountdownTool: ToolDefinition = {
  meta: {
    slug: 'contador-para-exame',
    category: 'estudo',
    name: 'Contador para o exame',
    shortDescription: 'Mostra quanto tempo falta para um exame ou outro evento importante.',
    description:
      'Indica a data (e, opcionalmente, a hora) de um exame ou evento e vê a contagem decrescente em tempo real, com a data e hora sempre interpretadas no teu fuso horário local.',
    icon: Hourglass,
    keywords: [
      'contador para exame',
      'contagem decrescente',
      'exame',
      'data de exame',
      'quanto tempo falta',
      'evento',
    ],
    relatedSlugs: ['temporizador-pomodoro', 'planeador-de-estudo'],
  },
  Component: ExamCountdownTool,
}

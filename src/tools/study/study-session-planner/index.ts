import { CalendarClock } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { StudySessionPlannerTool } from './StudySessionPlannerTool'

export const studySessionPlannerTool: ToolDefinition = {
  meta: {
    slug: 'planeador-de-estudo',
    category: 'estudo',
    name: 'Planeador de sessões de estudo',
    shortDescription: 'Divide o tempo disponível igualmente entre as disciplinas que precisas de estudar.',
    description:
      'Indica quanto tempo tens disponível e as disciplinas ou tarefas que precisas de estudar, e recebe um plano com o tempo de cada uma dividido de forma justa, mais uma sugestão de pausas.',
    icon: CalendarClock,
    keywords: [
      'planeador de estudo',
      'plano de estudo',
      'horário de estudo',
      'gestão de tempo',
      'disciplinas',
      'pausas',
      'produtividade',
    ],
    relatedSlugs: ['temporizador-pomodoro', 'calculadora-media'],
  },
  Component: StudySessionPlannerTool,
}

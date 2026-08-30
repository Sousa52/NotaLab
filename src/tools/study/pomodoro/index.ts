import { Timer } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { PomodoroTool } from './PomodoroTool'

export const pomodoroTool: ToolDefinition = {
  meta: {
    slug: 'temporizador-pomodoro',
    category: 'estudo',
    name: 'Temporizador Pomodoro',
    shortDescription: 'Alterna sessões de foco e pausas para te ajudar a estudar com mais concentração.',
    description:
      'Temporizador Pomodoro com sessões de foco, pausas curtas e uma pausa longa a cada ciclo. Totalmente configurável e processado no teu navegador, sem contas nem serviços externos.',
    icon: Timer,
    keywords: ['pomodoro', 'temporizador', 'foco', 'estudo', 'produtividade', 'pausa'],
  },
  Component: PomodoroTool,
}

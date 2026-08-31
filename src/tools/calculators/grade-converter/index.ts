import { Gauge } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { GradeConverterTool } from './GradeConverterTool'

export const gradeConverterTool: ToolDefinition = {
  meta: {
    slug: 'conversor-de-notas',
    category: 'calculadoras',
    name: 'Conversor de notas',
    shortDescription: 'Converte notas entre a escala portuguesa (0–20), percentagem e GPA.',
    description:
      'Converte notas proporcionalmente entre a escala portuguesa (0–20), percentagem (0–100%) e GPA (0–4.0), tratando as notas máximas como equivalentes. Útil para teres uma ideia geral, por exemplo antes de um intercâmbio — mas não substitui a fórmula oficial de nenhuma instituição.',
    icon: Gauge,
    keywords: [
      'conversor de notas',
      'gpa',
      'percentagem',
      'escala portuguesa',
      'nota',
      'equivalência de notas',
      'erasmus',
      'intercâmbio',
    ],
    relatedSlugs: ['calculadora-media', 'calculadora-media-licenciatura', 'que-nota-preciso'],
  },
  Component: GradeConverterTool,
}

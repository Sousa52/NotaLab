import { Quote } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { ApaReferenceGeneratorTool } from './ApaReferenceGeneratorTool'

export const apaReferenceGeneratorTool: ToolDefinition = {
  meta: {
    slug: 'gerador-referencias-apa',
    category: 'texto',
    name: 'Gerador de referências APA 7',
    shortDescription: 'Gera referências bibliográficas simplificadas em formato APA 7.',
    description:
      'Gera referências em formato APA 7 simplificado para livros, websites, artigos científicos e teses ou dissertações. Preenche os campos relevantes e recebe a referência já formatada, pronta a copiar.',
    icon: Quote,
    keywords: [
      'referências apa',
      'apa 7',
      'bibliografia',
      'citações',
      'referências bibliográficas',
      'normas apa',
      'trabalho académico',
    ],
    relatedSlugs: ['contador-de-palavras', 'planeador-de-estudo'],
  },
  Component: ApaReferenceGeneratorTool,
}

import { AlignLeft } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { WordCounterTool } from './WordCounterTool'

export const wordCounterTool: ToolDefinition = {
  meta: {
    slug: 'contador-de-palavras',
    category: 'texto',
    name: 'Contador de palavras e caracteres',
    shortDescription: 'Conta palavras, caracteres, frases, parágrafos e linhas em tempo real.',
    description:
      'Cola ou escreve texto para veres instantaneamente o número de palavras, caracteres, frases, parágrafos e linhas. Tudo processado localmente, sem enviar o texto para nenhum servidor.',
    icon: AlignLeft,
    keywords: ['contador de palavras', 'contador de caracteres', 'texto', 'frases', 'parágrafos', 'linhas'],
  },
  Component: WordCounterTool,
}

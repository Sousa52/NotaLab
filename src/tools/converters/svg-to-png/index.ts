import { Shapes } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { SvgToPngTool } from './SvgToPngTool'

export const svgToPngTool: ToolDefinition = {
  meta: {
    slug: 'svg-para-png',
    category: 'ficheiros',
    name: 'SVG para PNG',
    shortDescription: 'Converte ficheiros SVG para PNG diretamente no navegador, na resolução que escolheres.',
    description:
      'Converte um ou vários ficheiros SVG para PNG, mantendo a proporção e a transparência, e escolhe a resolução: uma escala (1× a 4×) ou uma largura fixa. Descarrega cada ficheiro ou todos num .zip e vê uma pré-visualização antes. A conversão é feita inteiramente no teu navegador: os ficheiros nunca são enviados para um servidor, e o SVG é desenhado de forma isolada, sem executar scripts nem carregar recursos externos.',
    icon: Shapes,
    keywords: [
      'svg para png',
      'converter svg',
      'converter svg para png',
      'converter imagem',
      'converter imagens',
      'conversor de imagens',
      'svg',
      'png',
      'vetorial',
      'rasterizar',
      'sem upload',
    ],
    relatedSlugs: ['jpg-para-png', 'webp-para-png', 'png-para-jpg'],
  },
  Component: SvgToPngTool,
}

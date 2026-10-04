import { ImageDown } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { WebpToPngTool } from './WebpToPngTool'

export const webpToPngTool: ToolDefinition = {
  meta: {
    slug: 'webp-para-png',
    category: 'ficheiros',
    name: 'WebP para PNG',
    shortDescription: 'Converte imagens WebP para PNG diretamente no navegador, mantendo a transparência.',
    description:
      'Converte uma ou várias imagens WebP para PNG com as mesmas dimensões do original e com a transparência preservada, descarrega cada ficheiro ou todos num .zip e vê uma pré-visualização antes. A conversão é feita inteiramente no teu navegador: os ficheiros nunca são enviados para um servidor e os originais não são alterados. Nota: num WebP animado só é convertido o primeiro fotograma.',
    icon: ImageDown,
    keywords: [
      'webp para png',
      'converter webp',
      'converter webp para png',
      'converter imagem',
      'converter imagens',
      'conversor de imagens',
      'webp',
      'png',
      'transparência',
      'sem upload',
    ],
    relatedSlugs: ['jpg-para-png', 'png-para-jpg'],
  },
  Component: WebpToPngTool,
}

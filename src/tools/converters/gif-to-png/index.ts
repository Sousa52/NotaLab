import { ImageDown } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { GifToPngTool } from './GifToPngTool'

export const gifToPngTool: ToolDefinition = {
  meta: {
    slug: 'gif-para-png',
    category: 'ficheiros',
    name: 'GIF para PNG',
    shortDescription: 'Converte imagens GIF para PNG diretamente no navegador; num GIF animado, só o primeiro fotograma.',
    description:
      'Converte uma ou várias imagens GIF para PNG com as mesmas dimensões do original, descarrega cada ficheiro ou todos num .zip e vê uma pré-visualização antes. Num GIF animado só é convertido o primeiro fotograma: o PNG é uma imagem estática e a animação não é mantida. A transparência é preservada quando o navegador a consegue ler. A conversão é feita inteiramente no teu navegador: os ficheiros nunca são enviados para um servidor e os originais não são alterados.',
    icon: ImageDown,
    keywords: [
      'gif para png',
      'converter gif',
      'converter gif para png',
      'primeiro fotograma',
      'gif animado',
      'converter imagem',
      'converter imagens',
      'conversor de imagens',
      'gif',
      'png',
      'sem upload',
    ],
    relatedSlugs: ['jpg-para-png', 'webp-para-png', 'svg-para-png'],
  },
  Component: GifToPngTool,
}

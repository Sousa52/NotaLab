import { ImageUp } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { JpgToWebpTool } from './JpgToWebpTool'

export const jpgToWebpTool: ToolDefinition = {
  meta: {
    slug: 'jpg-para-webp',
    category: 'ficheiros',
    name: 'JPG para WebP',
    shortDescription: 'Converte imagens JPG e JPEG para WebP diretamente no navegador, com qualidade à tua escolha.',
    description:
      'Converte uma ou várias imagens JPG/JPEG para WebP com as mesmas dimensões do original, escolhe a qualidade do WebP (85% por omissão), descarrega cada ficheiro ou todos num .zip e vê uma pré-visualização antes. A conversão é feita inteiramente no teu navegador: os ficheiros nunca são enviados para um servidor e os originais não são alterados. Nota: o WebP costuma ocupar menos espaço do que o JPG, mas nem todos os programas antigos o abrem, e o navegador tem de conseguir criar imagens WebP.',
    icon: ImageUp,
    keywords: [
      'jpg para webp',
      'jpeg para webp',
      'converter jpg para webp',
      'converter imagem',
      'converter imagens',
      'conversor de imagens',
      'comprimir imagem',
      'reduzir tamanho da imagem',
      'webp',
      'jpg',
      'jpeg',
      'qualidade webp',
      'sem upload',
    ],
    relatedSlugs: ['jpg-para-png', 'png-para-jpg', 'webp-para-png'],
  },
  Component: JpgToWebpTool,
}

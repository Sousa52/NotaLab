import { ImageUp } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { PngToJpgTool } from './PngToJpgTool'

export const pngToJpgTool: ToolDefinition = {
  meta: {
    slug: 'png-para-jpg',
    category: 'ficheiros',
    name: 'PNG para JPG',
    shortDescription: 'Converte imagens PNG para JPG diretamente no navegador, com qualidade à tua escolha.',
    description:
      'Converte uma ou várias imagens PNG para JPG com as mesmas dimensões do original, escolhe a qualidade do JPG (90% por omissão), descarrega cada ficheiro ou todos num .zip e vê uma pré-visualização antes. A conversão é feita inteiramente no teu navegador: os ficheiros nunca são enviados para um servidor e os originais não são alterados. Nota: o JPG não suporta transparência, por isso as áreas transparentes ficam com fundo branco.',
    icon: ImageUp,
    keywords: [
      'png para jpg',
      'png para jpeg',
      'converter png',
      'converter imagem',
      'converter imagens',
      'conversor de imagens',
      'png',
      'jpg',
      'jpeg',
      'qualidade jpg',
      'fundo branco',
      'sem upload',
    ],
    relatedSlugs: ['jpg-para-png'],
  },
  Component: PngToJpgTool,
}

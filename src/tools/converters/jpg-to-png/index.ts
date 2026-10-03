import { ImageDown } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { JpgToPngTool } from './JpgToPngTool'

export const jpgToPngTool: ToolDefinition = {
  meta: {
    slug: 'jpg-para-png',
    category: 'ficheiros',
    name: 'JPG para PNG',
    shortDescription: 'Converte imagens JPG e JPEG para PNG diretamente no navegador, sem enviar nada.',
    description:
      'Converte uma ou várias imagens JPG/JPEG para PNG com as mesmas dimensões do original, descarrega cada ficheiro ou todos num .zip e vê uma pré-visualização antes. A conversão é feita inteiramente no teu navegador: os ficheiros nunca são enviados para um servidor e os originais não são alterados. Nota: o JPG não suporta transparência, por isso as áreas transparentes não podem ser recuperadas.',
    icon: ImageDown,
    keywords: [
      'jpg para png',
      'jpeg para png',
      'converter jpg',
      'converter imagem',
      'converter imagens',
      'conversor de imagens',
      'png',
      'jpg',
      'jpeg',
      'sem upload',
    ],
  },
  Component: JpgToPngTool,
}

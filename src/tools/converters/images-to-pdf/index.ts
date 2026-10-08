import { FileText } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { ImagesToPdfTool } from './ImagesToPdfTool'

export const imagesToPdfTool: ToolDefinition = {
  meta: {
    slug: 'imagens-para-pdf',
    category: 'ficheiros',
    name: 'Imagens para PDF',
    shortDescription: 'Junta imagens JPG, PNG e WebP num único PDF, uma por página A4, na ordem que escolheres.',
    description:
      'Escolhe ou arrasta várias imagens JPG, PNG ou WebP, ordena-as com os botões de subir e descer e cria um único PDF com uma imagem por página A4: centrada, inteira, sem cortes e mantendo a proporção (as imagens horizontais ficam em páginas na horizontal). As áreas transparentes ficam com fundo branco. Tudo é feito no teu navegador: as imagens nunca são enviadas para um servidor e os originais não são alterados.',
    icon: FileText,
    keywords: [
      'imagens para pdf',
      'jpg para pdf',
      'png para pdf',
      'webp para pdf',
      'converter imagens em pdf',
      'juntar imagens num pdf',
      'criar pdf',
      'fotografias para pdf',
      'pdf',
      'a4',
      'sem upload',
    ],
    relatedSlugs: ['jpg-para-png', 'png-para-jpg', 'webp-para-png'],
  },
  Component: ImagesToPdfTool,
}

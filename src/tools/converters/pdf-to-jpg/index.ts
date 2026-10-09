import { FileImage } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { PdfToJpgTool } from './PdfToJpgTool'

export const pdfToJpgTool: ToolDefinition = {
  meta: {
    slug: 'pdf-para-jpg',
    category: 'ficheiros',
    name: 'PDF para JPG',
    shortDescription: 'Converte cada página de um PDF numa imagem JPG, diretamente no navegador.',
    description:
      'Escolhe ou arrasta um ficheiro PDF e converte cada página numa imagem JPG separada, com a resolução à tua escolha (150 DPI por omissão). Descarrega o JPG de uma página ou, se o PDF tiver várias, todas as páginas num ficheiro .zip, com nomes como documento-pagina-1.jpg. A conversão é feita inteiramente no teu navegador: o PDF nunca é enviado para um servidor e o original não é alterado. Nota: o JPG não suporta transparência, por isso as áreas transparentes ficam com fundo branco; PDFs protegidos por palavra-passe não são suportados.',
    icon: FileImage,
    keywords: [
      'pdf para jpg',
      'pdf para jpeg',
      'pdf para imagem',
      'converter pdf',
      'converter pdf em imagem',
      'pdf em imagens',
      'páginas do pdf para jpg',
      'extrair páginas de pdf',
      'pdf',
      'jpg',
      'jpeg',
      'zip',
      'sem upload',
    ],
    relatedSlugs: ['imagens-para-pdf', 'png-para-jpg', 'jpg-para-png'],
  },
  Component: PdfToJpgTool,
}

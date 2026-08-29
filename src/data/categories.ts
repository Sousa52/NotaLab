import { GraduationCap, BookOpen, Calculator, FileStack, Type, LayoutGrid } from 'lucide-react'
import type { CategoryMeta } from '../types/tool'

export const categories: CategoryMeta[] = [
  {
    slug: 'academico',
    name: 'Académico',
    description: 'Médias, notas e cálculos para o percurso escolar e universitário.',
    icon: GraduationCap,
  },
  {
    slug: 'estudo',
    name: 'Estudo',
    description: 'Ferramentas para organizar o estudo e a produtividade.',
    icon: BookOpen,
  },
  {
    slug: 'calculadoras',
    name: 'Calculadoras',
    description: 'Cálculos do dia a dia, rápidos e sem complicações.',
    icon: Calculator,
  },
  {
    slug: 'ficheiros',
    name: 'Ficheiros',
    description: 'Converta e trate ficheiros diretamente no navegador.',
    icon: FileStack,
  },
  {
    slug: 'texto',
    name: 'Texto',
    description: 'Utilitários para contar, formatar e transformar texto.',
    icon: Type,
  },
  {
    slug: 'outros',
    name: 'Outros',
    description: 'Ferramentas úteis que não se encaixam nas restantes categorias.',
    icon: LayoutGrid,
  },
]

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug)
}

import { Ruler } from 'lucide-react'
import type { ToolDefinition } from '../../../types/tool'
import { UnitConverterTool } from './UnitConverterTool'

export const unitConverterTool: ToolDefinition = {
  meta: {
    slug: 'conversor-de-unidades',
    category: 'calculadoras',
    name: 'Conversor de unidades',
    shortDescription: 'Converte comprimento, peso, temperatura, volume e área em tempo real.',
    description:
      'Converte entre unidades de comprimento, peso/massa, temperatura, volume e área. Escolhe a categoria, as unidades de origem e destino, e vês o resultado instantaneamente — tudo calculado no teu navegador.',
    icon: Ruler,
    keywords: [
      'conversor de unidades',
      'comprimento',
      'peso',
      'massa',
      'temperatura',
      'volume',
      'área',
      'celsius',
      'fahrenheit',
      'polegadas',
      'litros',
    ],
  },
  Component: UnitConverterTool,
}

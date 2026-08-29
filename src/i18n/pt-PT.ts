export const ptPT = {
  common: {
    search: 'Pesquisar ferramentas',
    searchPlaceholder: 'Ex.: média ponderada, ECTS...',
    allTools: 'Todas as ferramentas',
    categories: 'Categorias',
    home: 'Início',
    relatedTools: 'Ferramentas relacionadas',
    noResults: 'Não foram encontradas ferramentas para essa pesquisa.',
    calculate: 'Calcular',
    clear: 'Limpar',
    add: 'Adicionar',
    remove: 'Remover',
    result: 'Resultado',
    processedLocally: 'Este ficheiro é processado no seu navegador. Nada é enviado para um servidor.',
  },
  nav: {
    tools: 'Ferramentas',
  },
  directory: {
    title: 'Ferramentas',
    subtitle: 'Explore todas as ferramentas do NotaLab, organizadas por categoria.',
    allCategories: 'Todas',
    comingSoonTitle: 'As primeiras ferramentas estão a chegar',
    comingSoonBody:
      'As calculadoras académicas de média ponderada, ECTS e "que nota preciso?" estão a ser preparadas. Volte em breve.',
    resultsCount: (n: number) => (n === 1 ? '1 ferramenta' : `${n} ferramentas`),
  },
  home: {
    tagline: 'Ferramentas simples para estudantes.',
    subtitle:
      'Calculadoras académicas, utilitários de estudo e conversores de ficheiros, tudo gratuito e sem conta necessária.',
    popularTools: 'Ferramentas populares',
    browseAll: 'Ver todas as ferramentas',
  },
  footer: {
    madeFor: 'Feito para estudantes.',
    privacyNote: 'Sem contas. Sem anúncios intrusivos. Ficheiros processados localmente sempre que possível.',
  },
} as const

export type TranslationDict = typeof ptPT

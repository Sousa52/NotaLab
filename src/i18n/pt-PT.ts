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
  textCounter: {
    textareaLabel: 'Texto',
    textareaPlaceholder: 'Cola ou escreve o teu texto aqui...',
    emptyState: 'Escreve ou cola texto acima para veres as estatísticas.',
    copy: 'Copiar texto',
    copied: 'Copiado!',
    words: 'Palavras',
    characters: 'Caracteres',
    charactersNoSpaces: 'Caracteres (sem espaços)',
    sentences: 'Frases',
    paragraphs: 'Parágrafos',
    lines: 'Linhas',
    howItWorks:
      'A contagem é feita localmente, no teu navegador — o texto nunca é enviado para um servidor. As palavras são sequências separadas por espaços; as frases terminam em ponto, interrogação ou exclamação; os parágrafos são separados por uma linha em branco.',
  },
  pomodoro: {
    modeFocus: 'Foco',
    modeShortBreak: 'Pausa curta',
    modeLongBreak: 'Pausa longa',
    sessionLabel: (current: number, total: number) => `Sessão ${current} de ${total}`,
    start: 'Iniciar',
    resume: 'Retomar',
    pause: 'Pausar',
    reset: 'Reiniciar',
    skip: 'Saltar sessão',
    progressLabel: 'Progresso da sessão atual',
    settingsToggle: 'Definições',
    focusDuration: 'Duração do foco (min)',
    shortBreakDuration: 'Duração da pausa curta (min)',
    longBreakDuration: 'Duração da pausa longa (min)',
    sessionsBeforeLongBreak: 'Sessões antes da pausa longa',
    settingsRunningHint: 'O temporizador está em curso — as novas durações só se aplicam a partir da próxima sessão.',
    howItWorks:
      'Cada ciclo alterna sessões de foco com pausas curtas. Depois do número configurado de sessões de foco, segue-se uma pausa longa e um novo ciclo começa. O temporizador usa a hora real do sistema, por isso mantém-se certo mesmo que mudes de separador ou o computador fique ocupado.',
    announceStart: (mode: string) => `${mode} iniciado.`,
    announceResume: (mode: string) => `${mode} retomado.`,
    announcePause: 'Temporizador em pausa.',
    announceReset: 'Temporizador reiniciado.',
    announceSkip: (mode: string) => `Sessão saltada. A começar: ${mode}.`,
    announceAutoAdvance: (mode: string) => `Sessão terminada. A começar: ${mode}.`,
  },
  unitConverter: {
    categoryLabel: 'Categoria',
    fromUnitLabel: 'De',
    toUnitLabel: 'Para',
    valueLabel: 'Valor',
    swapLabel: 'Trocar unidades',
    invalidValue: 'Introduz um número válido.',
    howItWorks:
      'A conversão é feita localmente, no teu navegador — não precisas de conta nem de ligação à internet. As unidades de comprimento, peso, volume e área usam um fator fixo em relação a uma unidade base; a temperatura usa fórmulas próprias, porque Celsius, Fahrenheit e Kelvin não estão relacionados por um simples fator.',
  },
  gradeConverter: {
    fromScaleLabel: 'De',
    toScaleLabel: 'Para',
    valueLabel: 'Valor',
    swapLabel: 'Trocar escalas',
    invalidValue: 'Introduz um número válido.',
    outOfRange: (min: number, max: number) => `O valor tem de estar entre ${min} e ${max}.`,
    disclaimer:
      'Esta conversão é uma aproximação matemática proporcional (20 valores = 100% = 4.0 de GPA), não uma equivalência oficial. Cada instituição pode ter a sua própria fórmula de conversão — consulta sempre os serviços académicos antes de usar este valor formalmente.',
    howItWorks:
      'A conversão trata a nota máxima de cada escala como equivalente (20 valores = 100% = 4.0 de GPA) e escala o valor proporcionalmente entre as duas escalas escolhidas. Tudo calculado localmente, no teu navegador, sem conta nem ligação à internet.',
  },
  studyPlanner: {
    hoursLabel: 'Horas disponíveis',
    minutesLabel: 'Minutos adicionais',
    subjectLegend: (n: number) => `Assunto ${n}`,
    subjectNameLabel: 'Nome',
    subjectNamePlaceholder: 'Ex.: Matemática',
    removeSubject: (n: number) => `Remover assunto ${n}`,
    addSubject: 'Adicionar assunto',
    generate: 'Gerar plano',
    invalidNumber: 'Introduz um número válido (0 ou mais).',
    invalidDuration: 'A duração total tem de ser maior que zero.',
    noSubjects: 'Adiciona pelo menos um assunto.',
    emptyState: 'Preenche o tempo disponível e os assuntos, depois clica em «Gerar plano».',
    totalLabel: 'Tempo total:',
    subjectCountLabel: 'Assuntos:',
    breakSuggestion: (count: number, minutesEach: number) =>
      count === 1
        ? `Sugestão: 1 pausa de ${minutesEach} minutos.`
        : `Sugestão: ${count} pausas de ${minutesEach} minutos cada.`,
    noBreakNeeded: 'Sessão curta — não sugerimos nenhuma pausa.',
    howItWorks:
      'O tempo disponível é dividido igualmente por todos os assuntos (sem prioridades, por agora). A sugestão de pausas é apenas indicativa e não reduz o tempo de estudo que indicaste — tudo calculado localmente, no teu navegador.',
  },
} as const

export type TranslationDict = typeof ptPT

# NotaLab

Ferramentas simples para estudantes — calculadoras académicas, utilitários de estudo e conversores de ficheiros, gratuitos e sem necessidade de conta.

> **Estado atual:** arquitetura, design system, homepage e diretório de ferramentas implementados. Ferramentas disponíveis: calculadora de média ponderada, "que nota preciso?", calculadora de média da licenciatura, contador de palavras e caracteres, e temporizador Pomodoro.

## Stack

- React + TypeScript
- Vite
- Tailwind CSS v4
- React Router
- lucide-react (ícones)

## Estrutura do projeto

```
src/
├── components/   # Componentes de UI reutilizáveis (Button, Field, Container, Seo...)
├── layouts/      # Header, Footer, RootLayout
├── pages/        # Páginas de topo (Home, ToolsDirectory...)
├── tools/        # Uma pasta por categoria; cada ferramenta é auto-contida
│   ├── academic/
│   ├── study/
│   ├── calculators/
│   ├── converters/
│   └── text/
├── lib/          # Funções utilitárias (ex.: cn)
├── hooks/        # React hooks partilhados
├── i18n/         # Dicionários de tradução e provider
├── types/        # Tipos partilhados (ToolMeta, CategoryMeta...)
├── data/         # Registo de categorias e ferramentas
└── styles/       # CSS global e tokens de design
```

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Testes

A lógica de cálculo/estado de cada ferramenta é independente da UI e testada com Vitest:

```bash
npm test
```

## Build de produção

```bash
npm run build
npm run preview
```

## Como adicionar uma ferramenta

1. Cria uma pasta em `src/tools/<categoria>/<nome-da-ferramenta>/` com o componente da ferramenta e a lógica de cálculo separada da UI.
2. Define o `ToolMeta` (nome, descrição, ícone, categoria, palavras-chave) junto ao componente.
3. Regista o `ToolDefinition` (meta + componente) em `src/data/tools.ts`.
4. A ferramenta aparece automaticamente na homepage, no diretório `/ferramentas` e recebe uma rota própria — sem alterar código não relacionado.

## Princípios do projeto

- **Privacidade primeiro:** ficheiros são processados localmente no navegador sempre que tecnicamente possível; nunca são enviados para um servidor sem necessidade real.
- **Sem contas nem base de dados** na versão inicial.
- **Sem dependências desnecessárias** — cada biblioteca adicionada tem de justificar o seu custo em bundle size e manutenção.
- **SEO real:** cada ferramenta tem rota própria, título, meta descrição e conteúdo genuinamente útil.

## Licença

Distribuído sob a [licença MIT](./LICENSE).

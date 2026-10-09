# NotaLab

Ferramentas simples para estudantes — calculadoras académicas, utilitários de estudo e conversores de ficheiros, gratuitos e sem necessidade de conta.

> **Estado atual:** arquitetura, design system, homepage e diretório de ferramentas implementados. Ferramentas disponíveis: calculadora de média ponderada, "que nota preciso?", calculadora de média da licenciatura, contador de palavras e caracteres, temporizador Pomodoro, conversor de unidades, conversor de notas, planeador de sessões de estudo, contador para o exame, gerador de referências APA 7, calculadora científica, calculadora de percentagens, calculadora de juros, calculadora de regra de três, calculadora de diferença de datas, calculadora de descontos, calculadora de média por ECTS, calculadora de IVA, calculadora de salário líquido, calculadora de juros compostos, simulador de crédito, conversor de JPG para PNG, conversor de PNG para JPG, conversor de WebP para PNG, conversor de SVG para PNG, conversor de GIF para PNG, conversor de imagens para PDF e conversor de PDF para JPG.

## Stack

- React + TypeScript
- Vite
- Tailwind CSS v4
- React Router
- lucide-react (ícones)
- pdf-lib (criar PDF) e PDF.js (`pdfjs-dist`, ler e desenhar PDF) — ambas carregadas só quando a ferramenta é usada

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

## PDF para JPG

A ferramenta `pdf-para-jpg` (categoria `ficheiros`) converte cada página de um PDF numa imagem JPG, tudo no navegador.

- **Limites:** um PDF de cada vez, até 20 MB e 50 páginas. Resolução à escolha (100, 150 por omissão ou 200 DPI), qualidade JPG fixa de 92% e fundo branco (o JPG não tem transparência). Páginas muito grandes são reduzidas automaticamente (máx. 16 megapíxeis e 8192 px por lado) para não esgotar a memória.
- **Resultado:** um JPG para PDFs de uma página; um `.zip` (criado no navegador com o escritor de ZIP partilhado com os outros conversores) para várias. Nomes: `documento-pagina-1.jpg` e `documento-jpg.zip`.
- **Biblioteca:** [PDF.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`, licença Apache-2.0), carregada com `import()` dinâmico, por isso não pesa no bundle inicial.
- **Worker e decoders:** o worker e os três decoders WebAssembly (`openjpeg.wasm`, `jbig2.wasm`, `qcms_bg.wasm`) são importados com `?url`. O PDF.js procura os decoders pelo nome do ficheiro, todos na mesma pasta, por isso o `vite.config.ts` emite-os sem hash em `assets/pdfjs/`. Sem eles, páginas digitalizadas que usam JPEG 2000 ou JBIG2 saem em branco. Ao atualizar o `pdfjs-dist`, confirma que estes ficheiros continuam a existir.
- **Limitações:** PDFs com palavra-passe não são suportados; tipos de letra não incorporados no PDF podem ser substituídos por outros do sistema. A dependência opcional `@napi-rs/canvas` do `pdfjs-dist` é só para Node e não é usada no navegador.

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

Todos os direitos reservados. Ver [LICENSE](./LICENSE) para os termos completos — o código está disponível publicamente para consulta e demonstração, mas não é open-source: cópia, redistribuição, hospedagem ou modificação sem autorização explícita não são permitidas.

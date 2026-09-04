// A small, safe expression parser/evaluator for the scientific calculator.
// Deliberately does NOT use eval() or new Function() — expressions are tokenized,
// parsed into an AST via recursive descent, and evaluated by walking that AST, so
// only the arithmetic/functions defined below can ever run.
//
// Trigonometric functions (sin, cos, tan) use DEGREES, not radians — the more
// familiar convention for NotaLab's general student audience. This is documented
// here and surfaced in the tool's "Como funciona" section.

export type CalculatorResult = { status: 'ok'; value: number } | { status: 'error'; message: string }

type FunctionName = 'sin' | 'cos' | 'tan' | 'log' | 'ln' | 'sqrt'

const FUNCTION_NAMES: readonly FunctionName[] = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt']

function isFunctionName(value: string): value is FunctionName {
  return (FUNCTION_NAMES as readonly string[]).includes(value)
}

type BinaryOperator = '+' | '-' | '*' | '/' | '^'

type AstNode =
  | { kind: 'number'; value: number }
  | { kind: 'constant'; name: 'pi' | 'e' }
  | { kind: 'binary'; operator: BinaryOperator; left: AstNode; right: AstNode }
  | { kind: 'unary'; operator: '+' | '-'; operand: AstNode }
  | { kind: 'percent'; operand: AstNode }
  | { kind: 'call'; name: FunctionName; argument: AstNode }

/** Thrown internally for any tokenization/parsing/evaluation problem; always caught by evaluateExpression. */
class CalculatorParseError extends Error {}

type TokenType = 'number' | '+' | '-' | '*' | '/' | '^' | '%' | '(' | ')' | 'ident' | 'eof'

interface Token {
  type: TokenType
  value: string
}

const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '^': '^',
  '%': '%',
  '(': '(',
  ')': ')',
}

/**
 * Normalizes calculator-specific/Portuguese input to the plain ASCII the tokenizer
 * expects: typographic operators (×, ÷, −), the constant symbol π, the root symbol
 * √, and Portuguese decimal commas.
 */
function normalizeExpression(input: string): string {
  return input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/,/g, '.')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
}

function tokenize(rawInput: string): Token[] {
  const input = normalizeExpression(rawInput)
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const char = input[i]

    if (char === ' ' || char === '\t' || char === '\n') {
      i += 1
      continue
    }

    if (/[0-9.]/.test(char)) {
      const start = i
      let sawDot = false
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === '.') {
          if (sawDot) break
          sawDot = true
        }
        i += 1
      }
      tokens.push({ type: 'number', value: input.slice(start, i) })
      continue
    }

    if (/[a-zA-Z]/.test(char)) {
      const start = i
      while (i < input.length && /[a-zA-Z]/.test(input[i])) {
        i += 1
      }
      tokens.push({ type: 'ident', value: input.slice(start, i) })
      continue
    }

    const singleCharType = SINGLE_CHAR_TOKENS[char]
    if (singleCharType) {
      tokens.push({ type: singleCharType, value: char })
      i += 1
      continue
    }

    throw new CalculatorParseError(`Carácter inesperado: "${char}".`)
  }

  tokens.push({ type: 'eof', value: '' })
  return tokens
}

/**
 * Recursive-descent parser. Grammar (lowest to highest precedence):
 *   expression := term (('+' | '-') term)*
 *   term       := unary (('*' | '/') unary)*
 *   unary      := ('-' | '+') unary | power
 *   power      := postfix ('^' unary)?        (right-associative; RHS allows negative exponents)
 *   postfix    := primary ('%')*              (percent divides by 100, e.g. "50%" = 0.5)
 *   primary    := NUMBER | 'pi' | 'e' | FUNCTION '(' expression ')' | '(' expression ')'
 *
 * Note: unary minus has LOWER precedence than power, so "-2^2" = -(2^2) = -4, matching
 * standard mathematical convention. Implicit multiplication (e.g. "2(3+4)") is not
 * supported — operators must be explicit, matching every example in the tool's spec.
 */
class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    const token = this.tokens[this.pos]
    this.pos += 1
    return token
  }

  private expect(type: TokenType, message: string): Token {
    if (this.peek().type !== type) {
      throw new CalculatorParseError(message)
    }
    return this.advance()
  }

  parse(): AstNode {
    const node = this.parseExpression()
    if (this.peek().type !== 'eof') {
      throw new CalculatorParseError('Expressão inválida.')
    }
    return node
  }

  private parseExpression(): AstNode {
    let node = this.parseTerm()
    while (this.peek().type === '+' || this.peek().type === '-') {
      const operator = this.advance().type as '+' | '-'
      node = { kind: 'binary', operator, left: node, right: this.parseTerm() }
    }
    return node
  }

  private parseTerm(): AstNode {
    let node = this.parseUnary()
    while (this.peek().type === '*' || this.peek().type === '/') {
      const operator = this.advance().type as '*' | '/'
      node = { kind: 'binary', operator, left: node, right: this.parseUnary() }
    }
    return node
  }

  private parseUnary(): AstNode {
    if (this.peek().type === '-' || this.peek().type === '+') {
      const operator = this.advance().type as '+' | '-'
      return { kind: 'unary', operator, operand: this.parseUnary() }
    }
    return this.parsePower()
  }

  private parsePower(): AstNode {
    const base = this.parsePostfix()
    if (this.peek().type === '^') {
      this.advance()
      return { kind: 'binary', operator: '^', left: base, right: this.parseUnary() }
    }
    return base
  }

  private parsePostfix(): AstNode {
    let node = this.parsePrimary()
    while (this.peek().type === '%') {
      this.advance()
      node = { kind: 'percent', operand: node }
    }
    return node
  }

  private parsePrimary(): AstNode {
    const token = this.peek()

    if (token.type === 'number') {
      this.advance()
      const value = Number(token.value)
      if (!Number.isFinite(value)) {
        throw new CalculatorParseError(`Número inválido: "${token.value}".`)
      }
      return { kind: 'number', value }
    }

    if (token.type === '(') {
      this.advance()
      const node = this.parseExpression()
      this.expect(')', 'Parêntesis não fechado.')
      return node
    }

    if (token.type === 'ident') {
      this.advance()
      const name = token.value.toLowerCase()

      if (name === 'pi') return { kind: 'constant', name: 'pi' }
      if (name === 'e') return { kind: 'constant', name: 'e' }

      if (isFunctionName(name)) {
        this.expect('(', `A função "${name}" precisa de parênteses, por exemplo "${name}(...)".`)
        const argument = this.parseExpression()
        this.expect(')', 'Parêntesis não fechado.')
        return { kind: 'call', name, argument }
      }

      throw new CalculatorParseError(`Função ou constante desconhecida: "${token.value}".`)
    }

    if (token.type === ')') {
      throw new CalculatorParseError('Parêntesis a fechar sem abertura correspondente.')
    }

    if (token.type === 'eof') {
      throw new CalculatorParseError('Expressão incompleta.')
    }

    throw new CalculatorParseError('Expressão inválida.')
  }
}

const DEGREES_TO_RADIANS = Math.PI / 180

function evaluateBinary(operator: BinaryOperator, left: number, right: number): number {
  switch (operator) {
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      if (right === 0) throw new CalculatorParseError('Não é possível dividir por zero.')
      return left / right
    case '^':
      return Math.pow(left, right)
  }
}

function evaluateCall(name: FunctionName, argument: number): number {
  switch (name) {
    case 'sin':
      return Math.sin(argument * DEGREES_TO_RADIANS)
    case 'cos':
      return Math.cos(argument * DEGREES_TO_RADIANS)
    case 'tan':
      return Math.tan(argument * DEGREES_TO_RADIANS)
    case 'log':
      if (argument <= 0) {
        throw new CalculatorParseError('Não é possível calcular o logaritmo de um número menor ou igual a zero.')
      }
      return Math.log10(argument)
    case 'ln':
      if (argument <= 0) {
        throw new CalculatorParseError('Não é possível calcular o logaritmo de um número menor ou igual a zero.')
      }
      return Math.log(argument)
    case 'sqrt':
      if (argument < 0) {
        throw new CalculatorParseError('Não é possível calcular a raiz quadrada de um número negativo.')
      }
      return Math.sqrt(argument)
  }
}

function evaluateNode(node: AstNode): number {
  switch (node.kind) {
    case 'number':
      return node.value
    case 'constant':
      return node.name === 'pi' ? Math.PI : Math.E
    case 'unary':
      return node.operator === '-' ? -evaluateNode(node.operand) : evaluateNode(node.operand)
    case 'percent':
      return evaluateNode(node.operand) / 100
    case 'binary':
      return evaluateBinary(node.operator, evaluateNode(node.left), evaluateNode(node.right))
    case 'call':
      return evaluateCall(node.name, evaluateNode(node.argument))
  }
}

/** Parses and evaluates a calculator expression. Never throws — always returns a result. */
export function evaluateExpression(rawInput: string): CalculatorResult {
  if (rawInput.trim() === '') {
    return { status: 'error', message: 'Introduz uma expressão.' }
  }

  try {
    const tokens = tokenize(rawInput)
    const ast = new Parser(tokens).parse()
    const value = evaluateNode(ast)

    if (!Number.isFinite(value)) {
      return { status: 'error', message: 'O resultado não é um número válido.' }
    }
    return { status: 'ok', value }
  } catch (error) {
    if (error instanceof CalculatorParseError) {
      return { status: 'error', message: error.message }
    }
    return { status: 'error', message: 'Expressão inválida.' }
  }
}

/** Formats a result for display: trims floating-point noise, keeps useful precision. */
export function formatCalculatorResult(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const cleaned = Number(value.toPrecision(10))
  return cleaned.toLocaleString('pt-PT', { maximumFractionDigits: 10 })
}

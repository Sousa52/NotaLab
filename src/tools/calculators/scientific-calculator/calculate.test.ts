import { describe, expect, it } from 'vitest'
import { evaluateExpression, formatCalculatorResult } from './calculate'

function ok(expression: string): number {
  const result = evaluateExpression(expression)
  if (result.status !== 'ok') {
    throw new Error(`Expected "${expression}" to evaluate successfully, got error: ${result.status === 'error' ? result.message : ''}`)
  }
  return result.value
}

function errorMessage(expression: string): string {
  const result = evaluateExpression(expression)
  if (result.status !== 'error') {
    throw new Error(`Expected "${expression}" to fail, got value: ${result.status === 'ok' ? result.value : ''}`)
  }
  return result.message
}

describe('basic operations', () => {
  it('adds', () => {
    expect(ok('2 + 2')).toBe(4)
  })

  it('subtracts', () => {
    expect(ok('10 - 3')).toBe(7)
  })

  it('multiplies', () => {
    expect(ok('5 × 3')).toBe(15)
    expect(ok('5 * 3')).toBe(15)
  })

  it('divides', () => {
    expect(ok('10 ÷ 5')).toBe(2)
    expect(ok('10 / 4')).toBe(2.5)
  })

  it('respects operator precedence', () => {
    expect(ok('2 + 3 * 4')).toBe(14)
    expect(ok('2 * 3 + 4')).toBe(10)
  })

  it('handles nested parentheses', () => {
    expect(ok('(2 + 3) * 4')).toBe(20)
    expect(ok('((1 + 2) * (3 + 4))')).toBe(21)
    expect(ok('2 * (3 + (4 - 1))')).toBe(12)
  })

  it('handles decimal numbers, including a Portuguese comma decimal', () => {
    expect(ok('1.5 + 2.5')).toBe(4)
    expect(ok('1,5 + 2,5')).toBe(4)
  })
})

describe('unary numbers', () => {
  it('evaluates a plain negative number', () => {
    expect(ok('-5')).toBe(-5)
  })

  it('evaluates negative numbers inside expressions', () => {
    expect(ok('-5 + 10')).toBe(5)
    expect(ok('10 + -5')).toBe(5)
    expect(ok('-(2 + 3)')).toBe(-5)
  })

  it('allows chained unary signs', () => {
    expect(ok('--5')).toBe(5)
    expect(ok('-+5')).toBe(-5)
  })
})

describe('powers', () => {
  it('computes positive integer powers', () => {
    expect(ok('2 ^ 3')).toBe(8)
    expect(ok('10 ^ 2')).toBe(100)
  })

  it('computes decimal powers', () => {
    expect(ok('4 ^ 0.5')).toBe(2)
    expect(ok('9 ^ 0.5')).toBeCloseTo(3, 10)
  })

  it('supports negative exponents', () => {
    expect(ok('2 ^ -3')).toBeCloseTo(0.125, 10)
  })

  it('gives unary minus lower precedence than power: "-2^2" is -(2^2), not (-2)^2', () => {
    expect(ok('-2 ^ 2')).toBe(-4)
    expect(ok('(-2) ^ 2')).toBe(4)
  })

  it('supports the square button behavior (^2)', () => {
    expect(ok('5^2')).toBe(25)
  })
})

describe('scientific functions (degrees)', () => {
  it('computes sin', () => {
    expect(ok('sin(90)')).toBeCloseTo(1, 10)
    expect(ok('sin(0)')).toBeCloseTo(0, 10)
  })

  it('computes cos', () => {
    expect(ok('cos(0)')).toBeCloseTo(1, 10)
    expect(ok('cos(180)')).toBeCloseTo(-1, 10)
  })

  it('computes tan', () => {
    expect(ok('tan(45)')).toBeCloseTo(1, 10)
    expect(ok('tan(0)')).toBeCloseTo(0, 10)
  })

  it('computes log (base 10) and ln (natural log)', () => {
    expect(ok('log(100)')).toBeCloseTo(2, 10)
    expect(ok('ln(1)')).toBeCloseTo(0, 10)
  })

  it('supports the constants pi and e', () => {
    expect(ok('pi')).toBeCloseTo(Math.PI, 10)
    expect(ok('e')).toBeCloseTo(Math.E, 10)
    expect(ok('π')).toBeCloseTo(Math.PI, 10)
  })

  it('combines a function with other operators', () => {
    expect(ok('sin(90) + cos(0)')).toBeCloseTo(2, 10)
  })
})

describe('square roots', () => {
  it('computes a valid square root', () => {
    expect(ok('√(16)')).toBe(4)
    expect(ok('sqrt(16)')).toBe(4)
    expect(ok('sqrt(2)')).toBeCloseTo(Math.SQRT2, 10)
  })

  it('computes the square root of zero', () => {
    expect(ok('sqrt(0)')).toBe(0)
  })

  it('errors on the square root of a negative number', () => {
    expect(errorMessage('sqrt(-1)')).toContain('raiz quadrada')
  })
})

describe('percentage', () => {
  it('converts a standalone percentage to its decimal equivalent', () => {
    expect(ok('50%')).toBe(0.5)
    expect(ok('200%')).toBe(2)
  })

  it('applies percentage within multiplication predictably (percent = value / 100)', () => {
    expect(ok('200 * 10%')).toBe(20)
    expect(ok('200 × 10%')).toBe(20)
  })

  it('does not implement the "add X% of value" calculator-specific shortcut', () => {
    // 100 + 10% means 100 + (10/100) = 100.1, not "100 plus 10% of 100" (=110).
    // This is the documented, non-surprising behavior.
    expect(ok('100 + 10%')).toBeCloseTo(100.1, 10)
  })
})

describe('errors', () => {
  it('reports division by zero', () => {
    expect(errorMessage('5 / 0')).toContain('dividir por zero')
  })

  it('reports mismatched parentheses (unclosed)', () => {
    expect(errorMessage('(2 + 3')).toContain('não fechado')
  })

  it('reports mismatched parentheses (unexpected close where a value is expected)', () => {
    expect(errorMessage('3 * )')).toContain('sem abertura correspondente')
  })

  it('reports an incomplete expression', () => {
    expect(errorMessage('2 +')).not.toBe('')
  })

  it('reports an unexpected character', () => {
    expect(errorMessage('2 & 3')).toContain('Carácter inesperado')
  })

  it('reports an unknown function/identifier', () => {
    expect(errorMessage('foo(2)')).toContain('desconhecida')
  })

  it('rejects an empty expression', () => {
    expect(errorMessage('')).toContain('expressão')
    expect(errorMessage('   ')).toContain('expressão')
  })

  it('rejects a function call missing its parentheses', () => {
    expect(errorMessage('sin 90')).toContain('parênteses')
  })

  it('rejects malformed trailing input instead of silently guessing', () => {
    expect(errorMessage('2 3')).not.toBe('')
  })

  it('does not support implicit multiplication', () => {
    expect(errorMessage('2(3)')).not.toBe('')
  })
})

describe('formatCalculatorResult', () => {
  it('trims classic floating-point artifacts', () => {
    expect(formatCalculatorResult(0.1 + 0.2)).toBe('0,3')
  })

  it('formats whole numbers without a decimal part', () => {
    expect(formatCalculatorResult(4)).toBe('4')
  })

  it('preserves meaningful precision for irrational results', () => {
    const formatted = formatCalculatorResult(Math.SQRT2)
    expect(formatted.startsWith('1,4142135')).toBe(true)
  })
})

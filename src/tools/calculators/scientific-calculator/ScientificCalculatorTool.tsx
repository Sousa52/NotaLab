import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Delete, Eraser } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { evaluateExpression, formatCalculatorResult, type CalculatorResult } from './calculate'

interface CalcButtonProps {
  label: ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  ariaLabel?: string
}

/** A grid-sized button wrapping the shared Button component, kept local to this tool's keypad. */
function CalcButton({ label, onClick, variant = 'secondary', ariaLabel }: CalcButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      aria-label={ariaLabel}
      className="h-11 w-full justify-center text-base"
    >
      {label}
    </Button>
  )
}

/** Buttons that start with one of these characters continue from the previous result rather than replacing it. */
const CONTINUES_FROM_RESULT = /^[+\-*/^%]/

export function ScientificCalculatorTool() {
  const t = useI18n()
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState<CalculatorResult | null>(null)
  const resultRegionId = useId()

  function insertText(text: string) {
    if (result !== null) {
      if (result.status === 'ok' && CONTINUES_FROM_RESULT.test(text)) {
        setExpression(String(result.value) + text)
      } else {
        setExpression(text)
      }
      setResult(null)
      return
    }
    setExpression((prev) => prev + text)
  }

  function handleExpressionChange(value: string) {
    setExpression(value)
    setResult(null)
  }

  function handleEvaluate() {
    setResult(evaluateExpression(expression))
  }

  function handleClear() {
    setExpression('')
    setResult(null)
  }

  function handleBackspace() {
    if (result !== null) {
      setExpression('')
      setResult(null)
      return
    }
    setExpression((prev) => prev.slice(0, -1))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEvaluate()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Field
          label={t.scientificCalculator.expressionLabel}
          placeholder={t.scientificCalculator.expressionPlaceholder}
          value={expression}
          onChange={(e) => handleExpressionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-lg"
        />

        <div id={resultRegionId} aria-live="polite" className="rounded-lg border border-ink-200 bg-ink-50 p-4">
          {result === null && <p className="text-sm text-ink-600">{t.scientificCalculator.emptyState}</p>}
          {result?.status === 'error' && (
            <p className="text-sm font-medium text-red-700">{result.message}</p>
          )}
          {result?.status === 'ok' && (
            <>
              <p className="text-sm font-medium text-ink-600">{t.common.result}</p>
              <p className="mt-0.5 break-words text-2xl font-semibold text-ink-950">
                {formatCalculatorResult(result.value)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2">
          <CalcButton label="sin" onClick={() => insertText('sin(')} />
          <CalcButton label="cos" onClick={() => insertText('cos(')} />
          <CalcButton label="tan" onClick={() => insertText('tan(')} />
          <CalcButton label="log" onClick={() => insertText('log(')} />
          <CalcButton label="ln" onClick={() => insertText('ln(')} />
        </div>
        <div className="grid grid-cols-5 gap-2">
          <CalcButton label="√" ariaLabel={t.scientificCalculator.sqrtLabel} onClick={() => insertText('√(')} />
          <CalcButton label="x²" ariaLabel={t.scientificCalculator.squareLabel} onClick={() => insertText('^2')} />
          <CalcButton label="xʸ" ariaLabel={t.scientificCalculator.powerLabel} onClick={() => insertText('^')} />
          <CalcButton label="π" onClick={() => insertText('π')} />
          <CalcButton label="e" onClick={() => insertText('e')} />
        </div>
        <div className="grid grid-cols-5 gap-2">
          <CalcButton label="(" onClick={() => insertText('(')} />
          <CalcButton label=")" onClick={() => insertText(')')} />
          <CalcButton label="%" onClick={() => insertText('%')} />
          <CalcButton
            label={<Eraser className="h-4 w-4" aria-hidden="true" />}
            ariaLabel={t.scientificCalculator.clearAll}
            onClick={handleClear}
          />
          <CalcButton
            label={<Delete className="h-4 w-4" aria-hidden="true" />}
            ariaLabel={t.scientificCalculator.backspace}
            onClick={handleBackspace}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <CalcButton label="7" onClick={() => insertText('7')} />
          <CalcButton label="8" onClick={() => insertText('8')} />
          <CalcButton label="9" onClick={() => insertText('9')} />
          <CalcButton label="÷" onClick={() => insertText('/')} />

          <CalcButton label="4" onClick={() => insertText('4')} />
          <CalcButton label="5" onClick={() => insertText('5')} />
          <CalcButton label="6" onClick={() => insertText('6')} />
          <CalcButton label="×" onClick={() => insertText('*')} />

          <CalcButton label="1" onClick={() => insertText('1')} />
          <CalcButton label="2" onClick={() => insertText('2')} />
          <CalcButton label="3" onClick={() => insertText('3')} />
          <CalcButton label="−" onClick={() => insertText('-')} />

          <CalcButton label="0" onClick={() => insertText('0')} />
          <CalcButton label="," onClick={() => insertText(',')} />
          <CalcButton label="=" variant="primary" ariaLabel={t.common.calculate} onClick={handleEvaluate} />
          <CalcButton label="+" onClick={() => insertText('+')} />
        </div>
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">{t.scientificCalculator.howItWorks}</p>
        <p className="mt-2">{t.scientificCalculator.degreesNote}</p>
      </div>
    </div>
  )
}

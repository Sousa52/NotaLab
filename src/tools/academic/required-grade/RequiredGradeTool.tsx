import { useId, useState } from 'react'
import { Field } from '../../../components/Field'
import { useI18n } from '../../../i18n'
import { formatGrade } from '../../../lib/format'
import { isValidGrade, isValidPercentage, parseLocaleNumber } from '../../../lib/validation'
import { calculateRequiredGrade } from './calculate'

export function RequiredGradeTool() {
  const t = useI18n()
  const [currentGrade, setCurrentGrade] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [desiredGrade, setDesiredGrade] = useState('')
  const [remainingWeight, setRemainingWeight] = useState('')
  const resultRegionId = useId()

  const parsed = {
    currentGrade: parseLocaleNumber(currentGrade),
    currentWeight: parseLocaleNumber(currentWeight),
    desiredGrade: parseLocaleNumber(desiredGrade),
    remainingWeight: parseLocaleNumber(remainingWeight),
  }

  const errors = {
    currentGrade:
      currentGrade.trim() === ''
        ? undefined
        : parsed.currentGrade === null || !isValidGrade(parsed.currentGrade)
          ? 'Nota entre 0 e 20.'
          : undefined,
    currentWeight:
      currentWeight.trim() === ''
        ? undefined
        : parsed.currentWeight === null || !isValidPercentage(parsed.currentWeight)
          ? 'Peso entre 0 e 100%.'
          : undefined,
    desiredGrade:
      desiredGrade.trim() === ''
        ? undefined
        : parsed.desiredGrade === null || !isValidGrade(parsed.desiredGrade)
          ? 'Nota entre 0 e 20.'
          : undefined,
    remainingWeight:
      remainingWeight.trim() === ''
        ? undefined
        : parsed.remainingWeight === null || !isValidPercentage(parsed.remainingWeight)
          ? 'Peso entre 0 e 100%.'
          : undefined,
  }

  const allFilled =
    currentGrade.trim() !== '' &&
    currentWeight.trim() !== '' &&
    desiredGrade.trim() !== '' &&
    remainingWeight.trim() !== ''
  const hasErrors = Object.values(errors).some(Boolean)
  const canCalculate =
    allFilled &&
    !hasErrors &&
    parsed.currentGrade !== null &&
    parsed.currentWeight !== null &&
    parsed.desiredGrade !== null &&
    parsed.remainingWeight !== null

  const result = canCalculate
    ? calculateRequiredGrade({
        currentGrade: parsed.currentGrade as number,
        currentWeight: parsed.currentWeight as number,
        desiredGrade: parsed.desiredGrade as number,
        remainingWeight: parsed.remainingWeight as number,
      })
    : null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nota atual (0–20)"
          inputMode="decimal"
          placeholder="12"
          value={currentGrade}
          onChange={(e) => setCurrentGrade(e.target.value)}
          error={errors.currentGrade}
        />
        <Field
          label="Peso da nota atual (%)"
          inputMode="decimal"
          placeholder="40"
          value={currentWeight}
          onChange={(e) => setCurrentWeight(e.target.value)}
          error={errors.currentWeight}
        />
        <Field
          label="Média final pretendida (0–20)"
          inputMode="decimal"
          placeholder="14"
          value={desiredGrade}
          onChange={(e) => setDesiredGrade(e.target.value)}
          error={errors.desiredGrade}
        />
        <Field
          label="Peso da avaliação restante (%)"
          inputMode="decimal"
          placeholder="60"
          value={remainingWeight}
          onChange={(e) => setRemainingWeight(e.target.value)}
          error={errors.remainingWeight}
        />
      </div>

      <div
        id={resultRegionId}
        aria-live="polite"
        className="rounded-lg border border-ink-200 bg-ink-50 p-6"
      >
        {!result && (
          <p className="text-sm text-ink-600">
            Preenche os quatro campos para calcular a nota que precisas.
          </p>
        )}
        {result?.status === 'ok' && (
          <>
            <p className="text-sm font-medium text-ink-600">{t.common.result}</p>
            <p className="mt-1 text-3xl font-semibold text-ink-950">
              Precisas de {formatGrade(result.requiredGrade)} valores.
            </p>
          </>
        )}
        {result?.status === 'already-achieved' && (
          <p className="text-sm font-medium text-ink-800">
            Já garantes esta média com a nota atual — não precisas de um mínimo na avaliação
            restante.
          </p>
        )}
        {result?.status === 'impossible' && (
          <p className="text-sm font-medium text-red-700">
            Este objetivo não é possível com os pesos atuais: precisarias de mais de 20 valores.
          </p>
        )}
        {result?.status === 'invalid-weight' && (
          <p className="text-sm font-medium text-red-700">
            O peso da avaliação restante tem de ser maior que 0%.
          </p>
        )}
      </div>

      <div className="border-t border-ink-200 pt-6 text-sm text-ink-600">
        <h2 className="font-medium text-ink-800">Como funciona</h2>
        <p className="mt-2">
          A ferramenta combina a nota e o peso que já tens com o peso que ainda falta para
          calcular que nota precisas na avaliação restante, de forma a atingir a média final que
          pretendes.
        </p>
      </div>
    </div>
  )
}

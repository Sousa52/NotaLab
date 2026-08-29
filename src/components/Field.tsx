import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../lib/cn'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  suffix?: ReactNode
}

export function Field({ label, error, hint, suffix, className, id, ...props }: FieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={cn(errorId, hintId) || undefined}
          className={cn(
            'w-full rounded-md border bg-white px-3 py-2 text-sm text-ink-950 placeholder:text-ink-400',
            'border-ink-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
            error && 'border-red-400',
            suffix ? 'pr-10' : '',
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-400">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

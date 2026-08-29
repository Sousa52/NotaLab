import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-sm',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
        variant === 'secondary' &&
          'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50',
        variant === 'ghost' && 'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
        className,
      )}
      {...props}
    />
  )
}

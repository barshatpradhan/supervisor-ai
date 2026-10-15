import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-text-on-primary hover:bg-primary-700',
  secondary:
    'border border-border-strong bg-surface-card text-text-primary hover:bg-surface-muted',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary',
  danger:
    'bg-danger-fg text-text-on-primary hover:bg-red-700/90',
}

export function Button({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex min-h-10 items-center justify-center rounded-control px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        variantClasses[variant],
        className,
      ].join(' ')}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}

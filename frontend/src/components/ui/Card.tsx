import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <section
      className={[
        'rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </section>
  )
}

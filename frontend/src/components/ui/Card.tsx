import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <section
      className={[
        'rounded-lg border border-border-subtle bg-surface-card p-5 shadow-card',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </section>
  )
}

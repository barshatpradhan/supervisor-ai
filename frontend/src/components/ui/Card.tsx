import type { HTMLAttributes, ReactNode } from 'react'

type CardVariant = 'default' | 'ai'
type CardPadding = 'md' | 'sm' | 'flush'

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  padding?: CardPadding
  variant?: CardVariant
}

const paddingClasses: Record<CardPadding, string> = {
  flush: '',
  md: 'p-4 xl:p-5',
  sm: 'p-3',
}

export function Card({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <section
      className={[
        'rounded-card border bg-surface-card shadow-card',
        variant === 'ai' ? 'border-ai-border' : 'border-border-default',
        // A caller passing its own p-* class keeps it; two padding utilities would fight.
        /(^|\s)p-\S+/.test(className) ? '' : paddingClasses[padding],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </section>
  )
}

interface CardHeaderProps {
  action?: ReactNode
  helper?: string
  icon?: ReactNode
  id?: string
  level?: 2 | 3
  title: ReactNode
}

/** Card title, one optional helper line and an action slot. No eyebrow, no paragraph. */
export function CardHeader({ action, helper, icon, id, level = 2, title }: CardHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3'

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <div className="min-w-0">
          <Heading className="section-title m-0 text-text-primary" id={id}>{title}</Heading>
          {helper ? <p className="helper m-0 text-text-tertiary">{helper}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

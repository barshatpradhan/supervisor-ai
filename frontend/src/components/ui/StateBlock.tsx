import { CircleAlert, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface StateBlockProps {
  action?: ReactNode
  children?: ReactNode
  compact?: boolean
  kind?: 'loading' | 'empty' | 'error'
  title?: string
}

/** Loading (skeleton), empty and error states for a card or a page. */
export function StateBlock({ action, children, compact = false, kind = 'empty', title }: StateBlockProps) {
  if (kind === 'loading') {
    return (
      <div aria-busy="true" className="grid gap-3" role="status">
        <span className="sr-only">{title ?? 'Loading'}</span>
        {Array.from({ length: compact ? 2 : 3 }).map((_, index) => (
          <div className="h-12 animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none" key={index} />
        ))}
      </div>
    )
  }

  const isError = kind === 'error'

  return (
    <div
      className={['flex flex-col items-center gap-3 text-center', compact ? 'py-6' : 'py-12'].join(' ')}
      role={isError ? 'alert' : undefined}
    >
      <span
        aria-hidden="true"
        className={[
          'inline-flex size-10 items-center justify-center rounded-pill',
          isError ? 'bg-danger-bg text-danger-fg' : 'bg-primary-100 text-primary-600',
        ].join(' ')}
      >
        {isError ? <CircleAlert size={18} /> : <Inbox size={18} />}
      </span>
      {title ? <p className="body-strong m-0 text-text-primary">{title}</p> : null}
      {children ? <p className="body m-0 max-w-md text-text-secondary">{children}</p> : null}
      {action}
    </div>
  )
}

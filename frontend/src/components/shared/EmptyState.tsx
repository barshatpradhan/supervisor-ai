import { Button } from '../ui/Button'

interface EmptyStateProps {
  actionLabel?: string
  description?: string
  onAction?: () => void
  title?: string
}

export function EmptyState({
  actionLabel,
  description = 'Create a record to get started.',
  onAction,
  title = 'Nothing here yet',
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border-subtle bg-surface-card p-6 text-center">
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

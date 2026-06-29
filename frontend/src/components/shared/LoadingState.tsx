interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-card p-4 text-sm font-medium text-ink-700"
      role="status"
    >
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}

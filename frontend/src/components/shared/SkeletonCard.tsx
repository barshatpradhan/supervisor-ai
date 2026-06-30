export function SkeletonCard() {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-card">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 rounded bg-surface-muted" />
        <div className="space-y-3">
          <div className="h-3 w-full rounded bg-surface-muted" />
          <div className="h-3 w-5/6 rounded bg-surface-muted" />
          <div className="h-3 w-2/3 rounded bg-surface-muted" />
        </div>
      </div>
    </section>
  )
}

export function SupervisorDashboardSkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-56 rounded bg-surface-muted" />
        <div className="h-4 w-[32rem] max-w-full rounded bg-surface-muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`dashboard-summary-skeleton-${index}`}
            className="space-y-4 rounded-lg border border-border-subtle bg-surface-card p-5"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
            <div className="h-8 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`dashboard-large-skeleton-${index}`}
              className="space-y-4 rounded-lg border border-border-subtle bg-surface-card p-5"
            >
              <div className="h-5 w-44 animate-pulse rounded bg-surface-muted" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div
                    key={`dashboard-large-skeleton-row-${index}-${rowIndex}`}
                    className="h-14 animate-pulse rounded bg-surface-canvas-alt"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`dashboard-side-skeleton-${index}`}
              className="space-y-4 rounded-lg border border-border-subtle bg-surface-card p-5"
            >
              <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div
                    key={`dashboard-side-skeleton-row-${index}-${rowIndex}`}
                    className="h-12 animate-pulse rounded bg-surface-canvas-alt"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

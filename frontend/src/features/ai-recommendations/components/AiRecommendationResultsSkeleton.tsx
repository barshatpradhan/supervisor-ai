export function AiRecommendationResultsSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`recommendation-skeleton-${index}`}
          className="space-y-4 rounded-lg border border-border-subtle bg-surface-card p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-ai-bg" />
              <div className="h-6 w-56 animate-pulse rounded bg-surface-canvas-alt" />
              <div className="h-4 w-40 animate-pulse rounded bg-surface-canvas-alt" />
            </div>
            <div className="h-10 w-28 animate-pulse rounded-full bg-ai-bg" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((__, metricIndex) => (
              <div
                key={`recommendation-skeleton-metric-${metricIndex}`}
                className="space-y-2 rounded-lg border border-border-subtle bg-surface-card-alt p-4"
              >
                <div className="h-3 w-20 animate-pulse rounded bg-surface-canvas-alt" />
                <div className="h-5 w-24 animate-pulse rounded bg-surface-canvas-alt" />
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-canvas-alt" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-canvas-alt" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface-canvas-alt" />
          </div>
        </div>
      ))}
    </div>
  )
}

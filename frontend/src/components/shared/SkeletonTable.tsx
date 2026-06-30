interface SkeletonTableProps {
  rows?: number
  columns?: number
}

export function SkeletonTable({ columns = 4, rows = 4 }: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
      <div className="border-b border-border-subtle px-4 py-3">
        <div className="animate-pulse flex gap-3">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <div
              key={`header-${columnIndex}`}
              className="h-4 flex-1 rounded bg-surface-muted"
            />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="px-4 py-4">
            <div className="animate-pulse flex gap-3">
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <div
                  key={`cell-${rowIndex}-${columnIndex}`}
                  className="h-3 flex-1 rounded bg-surface-muted"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { SkeletonCard } from './SkeletonCard'
import { SkeletonTable } from './SkeletonTable'

interface SkeletonPageProps {
  tableColumns?: number
  tableRows?: number
  titleWidth?: string
}

export function SkeletonPage({
  tableColumns = 4,
  tableRows = 4,
  titleWidth = 'w-56',
}: SkeletonPageProps) {
  return (
    <div className="grid gap-6">
      <div className="animate-pulse space-y-3">
        <div className={`h-8 ${titleWidth} rounded bg-surface-muted`} />
        <div className="h-4 w-80 max-w-full rounded bg-surface-muted" />
      </div>
      <SkeletonCard />
      <SkeletonTable columns={tableColumns} rows={tableRows} />
    </div>
  )
}

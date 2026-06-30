import { Card } from '../../../components/ui/Card'

export function EmployeeProfileSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-60 rounded bg-surface-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-surface-muted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-surface-muted" />
          <div className="h-4 w-64 rounded bg-surface-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-surface-muted" />
            <div className="h-3 w-5/6 rounded bg-surface-muted" />
            <div className="h-3 w-2/3 rounded bg-surface-muted" />
          </div>
        </Card>

        <Card className="animate-pulse space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-border-subtle bg-surface-muted/50 p-4"
              >
                <div className="h-3 w-24 rounded bg-surface-muted" />
                <div className="mt-3 h-6 w-20 rounded bg-surface-muted" />
                <div className="mt-2 h-3 w-full rounded bg-surface-muted" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="animate-pulse space-y-4">
        <div className="h-6 w-40 rounded bg-surface-muted" />
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-surface-muted" />
            <div className="h-11 w-full rounded bg-surface-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-surface-muted" />
            <div className="h-28 w-full rounded bg-surface-muted" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-32 rounded-lg bg-surface-muted" />
            <div className="h-32 rounded-lg bg-surface-muted" />
          </div>
        </div>
      </Card>
    </div>
  )
}

import { SkeletonCard } from '../../../../components/shared/SkeletonCard'

export function EmployeeDashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <section className="animate-pulse space-y-3 rounded-lg border border-border-subtle bg-surface-card p-5 shadow-card">
        <div className="h-4 w-32 rounded bg-surface-muted" />
        <div className="h-8 w-52 rounded bg-surface-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-surface-muted" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

interface MetricCardProps {
  change?: ReactNode
  detail?: string
  label: string
  value: ReactNode
}

export function MetricCard({ change, detail, label, value }: MetricCardProps) {
  return (
    <section className="rounded-xl border border-border-subtle bg-surface-card p-5">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-text-primary tabular-nums">{value}</p>
      {detail || change ? <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">{change}{detail ? <span>{detail}</span> : null}</div> : null}
    </section>
  )
}

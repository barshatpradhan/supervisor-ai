import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { StackedBar } from '../charts/StackedBar'
import type { ColorToken } from '../charts/chartColors'
import { ProgressBar } from './ProgressBar'

interface StatTileProps {
  context?: string
  href?: { label: string; to: string }
  label: string
  meter?: { label: string; segments: { color: ColorToken; label: string; value: number }[] }
  progress?: { label: string; value: number }
  value: ReactNode
}

/** A headline number. At most three per screen; everything else becomes a chart. */
export function StatTile({ context, href, label, meter, progress, value }: StatTileProps) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-border-default bg-surface-card p-4 shadow-card xl:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="label m-0 text-text-secondary">{label}</h2>
        {href ? <Link className="label text-text-link no-underline hover:text-primary-700" to={href.to}>{href.label}</Link> : null}
      </div>
      <p className="stat-xl m-0 text-text-primary">{value}</p>
      {context ? <p className="helper m-0 text-text-tertiary">{context}</p> : null}
      {meter ? (
        <>
          <StackedBar
            data={meter.segments.map((segment) => ({ color: segment.color, name: segment.label, value: segment.value }))}
            height={8}
            legend={false}
          />
          <p className="sr-only">
            {meter.label}: {meter.segments.map((segment) => `${segment.label} ${segment.value}`).join(', ')}
          </p>
        </>
      ) : null}
      {progress ? <ProgressBar label={progress.label} showValue={false} value={progress.value} /> : null}
    </section>
  )
}

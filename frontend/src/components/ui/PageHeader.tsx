import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  actions?: ReactNode
  back?: { label: string; to: string }
  meta?: ReactNode
  subtitle?: ReactNode
  title: ReactNode
}

/** The page's one H1, with an optional back link, meta badges, one helper line and actions. */
export function PageHeader({ actions, back, meta, subtitle, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {back ? (
        <Link className="label inline-flex min-h-8 items-center gap-1 self-start text-text-link no-underline hover:text-primary-700" to={back.to}>
          <ChevronLeft aria-hidden="true" size={16} />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title m-0 break-words text-text-primary">{title}</h1>
            {meta}
          </div>
          {subtitle ? <p className="body m-0 text-text-secondary">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}

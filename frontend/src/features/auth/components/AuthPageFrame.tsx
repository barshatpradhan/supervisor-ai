import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { SupervisorLogo } from '../../../components/ui/SupervisorLogo'

interface AuthPageFrameProps {
  children: ReactNode
  footerLabel: string
  footerLinkLabel: string
  footerTo: string
  maxWidthClassName?: string
  title: string
}

export function AuthPageFrame({
  children,
  footerLabel,
  footerLinkLabel,
  footerTo,
  maxWidthClassName = 'max-w-md',
  title,
}: AuthPageFrameProps) {
  return (
    <main className="flex flex-1 flex-col bg-surface-page px-4 py-8 text-ink-900 sm:px-6">
      <div className={`mx-auto flex w-full flex-1 ${maxWidthClassName} flex-col justify-center`}>
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            aria-label="Supervisor home"
            className="rounded-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
            to="/"
          >
            <SupervisorLogo />
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-ink-600 underline-offset-4 hover:text-primary-600 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
            to="/"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        <Card aria-labelledby="auth-title" className="p-6 sm:p-8">
          <h1 id="auth-title" className="text-2xl font-bold tracking-normal text-ink-900">
            {title}
          </h1>
          {children}
        </Card>
        <p className="mt-5 text-center text-sm text-ink-600">
          {footerLabel}{' '}
          <Link
            className="font-semibold text-primary-600 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
            to={footerTo}
          >
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </main>
  )
}

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
    <main className="min-h-screen bg-surface-page px-4 py-8 text-ink-900 sm:px-6">
      <div className={`mx-auto flex min-h-[calc(100vh-4rem)] w-full ${maxWidthClassName} flex-col justify-center`}>
        <div className="mb-8">
          <SupervisorLogo />
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

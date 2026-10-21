import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SupervisorLogo } from '../ui/SupervisorLogo'

/** Kept in step with the footer of the invitation email (backend/src/services/email/invitationTemplate.ts). */
const SITE_TAGLINE = 'Smarter workforce supervision, task planning and team insights.'

interface SiteFooterProps {
  /** Extra links shown beside the brand, such as the landing page's section links. */
  children?: ReactNode
}

export function SiteFooter({ children }: SiteFooterProps) {
  return (
    <footer className="border-t border-border-default bg-surface-card">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-md flex-col gap-2">
          <Link aria-label="Supervisor AI home" className="w-fit rounded-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300" to="/">
            <SupervisorLogo />
          </Link>
          <p className="helper m-0 text-text-secondary">{SITE_TAGLINE}</p>
          <p className="helper m-0 text-text-tertiary">© {new Date().getFullYear()} Supervisor AI. All rights reserved.</p>
        </div>
        {children ? (
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
            {children}
          </nav>
        ) : null}
      </div>
    </footer>
  )
}

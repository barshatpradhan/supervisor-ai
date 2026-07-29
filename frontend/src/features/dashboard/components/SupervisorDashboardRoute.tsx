import { EmptyState } from '../../../components/shared/EmptyState'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { SupervisorDashboardModule } from './SupervisorDashboardModule'

export function SupervisorDashboardRoute() {
  const { activeMembershipRole, activeOrganization } = useOrganization()

  if (
    activeMembershipRole !== 'organization_admin' &&
    activeMembershipRole !== 'supervisor'
  ) {
    return (
      <EmptyState
        description="Supervisor dashboard data is currently available only for supervisor and organization admin memberships."
        title="Dashboard is not available for this role"
      />
    )
  }

  return <div className="grid gap-6">
    {activeMembershipRole === 'organization_admin' ? <OrganizerWelcome /> : null}
    <SupervisorDashboardModule organizationId={activeOrganization?.id ?? null} organizationName={activeOrganization?.name ?? 'Organization'} />
  </div>
}

function OrganizerWelcome() {
  const [dismissed, setDismissed] = useState(() => window.localStorage.getItem('supervisor-ai:onboarding-dismissed') === 'true')
  if (dismissed) return null
  return <section aria-labelledby="onboarding-title" className="rounded-xl border border-primary-200 bg-primary-50 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary-700">First steps</p><h2 className="mt-2 text-xl font-bold text-ink-900" id="onboarding-title">Welcome to your organization workspace</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">Use these next steps to turn your first project requirements into a reviewed assignment. Completion is driven by your workspace data, so this checklist stays intentionally lightweight.</p></div><Button onClick={() => { window.localStorage.setItem('supervisor-ai:onboarding-dismissed', 'true'); setDismissed(true) }} variant="ghost">Dismiss</Button></div><div className="mt-5 flex flex-wrap gap-2"><Link className="inline-flex min-h-10 items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700" to="/projects">Create your first project</Link><Link className="inline-flex min-h-10 items-center rounded-md border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-100" to="/profile">Review your profile</Link></div></section>
}

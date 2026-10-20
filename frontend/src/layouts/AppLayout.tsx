import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { getNavigationItems } from '../config/navigation'
import { useAuth } from '../features/auth/hooks/useAuth'
import { OrganizationSwitcher } from '../features/organizations/components/OrganizationSwitcher'
import { useOrganization } from '../features/organizations/hooks/useOrganization'
import { useCurrentUserName } from '../hooks/useCurrentUserName'

const routeTitles: [prefix: string, title: string][] = [
  ['/admin/users/new', 'Create user'],
  ['/ai-recommendations', 'AI Recommendations'],
  ['/dashboard', 'Dashboard'],
  ['/employees', 'Team'],
  ['/forbidden', 'Access restricted'],
  ['/organization/invitations', 'Invitations'],
  ['/platform-admin', 'Platform'],
  ['/profile', 'Profile'],
  ['/projects', 'Projects'],
  ['/select-organization', 'Select organization'],
  ['/tasks', 'Tasks'],
  ['/team', 'Team'],
]

function getRouteTitle(pathname: string) {
  return routeTitles.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? 'Workspace'
}

export function AppLayout() {
  const location = useLocation()
  const { logout, user } = useAuth()
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const userName = useCurrentUserName(activeMembershipRole, activeOrganization?.id ?? null)
  const navigationItems = getNavigationItems({
    organizationRole: activeMembershipRole,
    platformRole: user?.platformRole ?? null,
  })

  // Each page renders its own H1; the shell only names the browser tab.
  useEffect(() => {
    document.title = `${getRouteTitle(location.pathname)} · Supervisor AI`
  }, [location.pathname])

  return (
    <PageShell
      activePath={location.pathname}
      headerLeading={<OrganizationSwitcher />}
      navigationItems={navigationItems}
      onSignOut={() => {
        logout()
      }}
      userEmail={user?.email ?? null}
      userName={userName}
    >
      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
        <Outlet />
      </main>
    </PageShell>
  )
}

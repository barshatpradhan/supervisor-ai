import { Outlet, useLocation } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { PageShell } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { getNavigationItems } from '../config/navigation'
import { useAuth } from '../features/auth/hooks/useAuth'
import { OrganizationSwitcher } from '../features/organizations/components/OrganizationSwitcher'
import { useOrganization } from '../features/organizations/hooks/useOrganization'

const routeTitles: Record<string, string> = {
  '/admin/users/new': 'Create user',
  '/ai-recommendations': 'AI Recommendations',
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/forbidden': 'Access restricted',
  '/organization/invitations': 'Invitations',
  '/profile': 'Profile',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
}

function getEyebrow(
  activeMembershipRole: ReturnType<typeof useOrganization>['activeMembershipRole'],
) {
  if (activeMembershipRole === 'employee') {
    return 'Employee workspace'
  }

  if (
    activeMembershipRole === 'organization_admin' ||
    activeMembershipRole === 'supervisor'
  ) {
    return 'Organization workspace'
  }

  return 'Supervisor workspace'
}

export function AppLayout() {
  const location = useLocation()
  const { logout, user } = useAuth()
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const title = routeTitles[location.pathname] ?? 'Dashboard'
  const navigationItems = getNavigationItems({
    organizationRole: activeMembershipRole,
    platformRole: user?.platformRole ?? null,
  })
  const eyebrow = activeOrganization
    ? `${getEyebrow(activeMembershipRole)} | ${activeOrganization.name}`
    : getEyebrow(activeMembershipRole)

  return (
    <PageShell
      actions={
        <Button
          onClick={() => {
            logout()
          }}
          variant="secondary"
        >
          Sign out
        </Button>
      }
      activeHref={location.pathname}
      eyebrow={eyebrow}
      navigationItems={navigationItems}
      sidebarContent={<OrganizationSwitcher />}
      title={title}
    >
      <main>
        <Container className="py-6 sm:py-8">
          <Outlet />
        </Container>
      </main>
    </PageShell>
  )
}

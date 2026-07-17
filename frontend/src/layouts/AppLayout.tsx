import { Outlet, useLocation } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { PageShell } from '../components/layout/PageShell'
import type { NavigationItem } from '../components/layout/Sidebar'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/hooks/useAuth'
import { OrganizationSwitcher } from '../features/organizations/components/OrganizationSwitcher'
import { useOrganization } from '../features/organizations/hooks/useOrganization'

const managerNavigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/employees', label: 'Employees' },
  { href: '/ai-recommendations', label: 'AI Recommendations' },
  { href: '/profile', label: 'Profile' },
]

const employeeNavigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/profile', label: 'Profile' },
]

const platformAdminNavigationItem: NavigationItem = {
  href: '/admin/users/new',
  label: 'New user',
}

const routeTitles: Record<string, string> = {
  '/admin/users/new': 'Create user',
  '/ai-recommendations': 'AI Recommendations',
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/forbidden': 'Access restricted',
  '/profile': 'Profile',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
}

function getEyebrow(activeRole: ReturnType<typeof useOrganization>['activeRole']) {
  if (activeRole === 'employee') {
    return 'Employee workspace'
  }

  if (activeRole === 'organization_admin' || activeRole === 'supervisor') {
    return 'Organization workspace'
  }

  return 'Supervisor workspace'
}

function getNavigationItems(input: {
  activeRole: ReturnType<typeof useOrganization>['activeRole']
  isPlatformAdmin: boolean
}) {
  const items =
    input.activeRole === 'employee'
      ? employeeNavigationItems
      : input.activeRole === 'organization_admin' || input.activeRole === 'supervisor'
        ? managerNavigationItems
        : []

  if (input.isPlatformAdmin) {
    return [...items, platformAdminNavigationItem]
  }

  return items
}

export function AppLayout() {
  const location = useLocation()
  const { logout, user } = useAuth()
  const { activeOrganization, activeRole } = useOrganization()
  const title = routeTitles[location.pathname] ?? 'Dashboard'
  const navigationItems = getNavigationItems({
    activeRole,
    isPlatformAdmin: user?.platformRole === 'platform_admin',
  })
  const eyebrow = activeOrganization
    ? `${getEyebrow(activeRole)} | ${activeOrganization.name}`
    : getEyebrow(activeRole)

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

import { Outlet, useLocation } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { PageShell } from '../components/layout/PageShell'
import type { NavigationItem } from '../components/layout/Sidebar'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/hooks/useAuth'

const navigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/employees', label: 'Employees' },
  { href: '/ai-recommendations', label: 'AI Recommendations' },
  { href: '/profile', label: 'Profile' },
]

const routeTitles: Record<string, string> = {
  '/ai-recommendations': 'AI Recommendations',
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/profile': 'Profile',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
}

export function AppLayout() {
  const location = useLocation()
  const { logoutUser } = useAuth()
  const title = routeTitles[location.pathname] ?? 'Dashboard'

  return (
    <PageShell
      actions={
        <Button onClick={logoutUser} variant="secondary">
          Sign out
        </Button>
      }
      activeHref={location.pathname}
      eyebrow="Supervisor workspace"
      navigationItems={navigationItems}
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

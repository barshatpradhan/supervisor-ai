import { Container } from './components/layout/Container'
import { PageShell } from './components/layout/PageShell'
import type { NavigationItem } from './components/layout/Sidebar'
import { EmptyState } from './components/shared/EmptyState'
import { ErrorState } from './components/shared/ErrorState'
import { LoadingState } from './components/shared/LoadingState'
import { Button } from './components/ui/Button'
import { Card } from './components/ui/Card'

const navigationItems: NavigationItem[] = [
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#projects', label: 'Projects' },
  { href: '#tasks', label: 'Tasks' },
  { href: '#employees', label: 'Employees' },
  { href: '#ai-recommendations', label: 'AI Recommendations' },
  { href: '#profile', label: 'Profile' },
]

function App() {
  return (
    <PageShell
      actions={
        <>
          <Button variant="secondary">Preview shell</Button>
          <Button>Foundation ready</Button>
        </>
      }
      activeHref="#dashboard"
      eyebrow="Phase 2"
      navigationItems={navigationItems}
      title="Frontend foundation"
    >
      <main id="dashboard" tabIndex={-1}>
        <Container className="py-6 sm:py-8">
          <div className="flex flex-col gap-6">
            <Card aria-labelledby="foundation-heading">
              <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-brand-700">Brand system</p>
                  <h2
                    id="foundation-heading"
                    className="mt-2 text-2xl font-bold tracking-normal text-ink-900"
                  >
                    Locked colors, logo, and responsive app shell are wired.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600">
                    This temporary screen verifies the shared shell and tokens before
                    feature pages, auth, dashboards, or API data are introduced.
                  </p>
                </div>
                <div className="grid gap-3 rounded-lg border border-border-subtle bg-surface-muted p-4">
                  <Button variant="primary">Primary action</Button>
                  <Button variant="secondary">Secondary action</Button>
                  <Button variant="ghost">Ghost action</Button>
                </div>
              </div>
            </Card>

            <section className="grid gap-4 md:grid-cols-3" aria-label="Shared states">
              <LoadingState label="Loading shared data" />
              <ErrorState message="The API client will normalize backend errors here." />
              <EmptyState
                description="Feature-specific empty states can reuse this component."
                title="Empty state"
              />
            </section>
          </div>
        </Container>
      </main>
    </PageShell>
  )
}

export default App

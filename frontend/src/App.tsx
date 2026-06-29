import { EmptyState } from './components/shared/EmptyState'
import { ErrorState } from './components/shared/ErrorState'
import { LoadingState } from './components/shared/LoadingState'
import { Button } from './components/ui/Button'
import { Card } from './components/ui/Card'

function App() {
  return (
    <main className="min-h-screen bg-surface-page px-5 py-8 text-ink-900 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white"
              aria-hidden="true"
            >
              SA
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-700">Supervisor AI</p>
              <h1 className="text-3xl font-bold tracking-normal text-ink-900">
                Frontend foundation
              </h1>
            </div>
          </div>
          <Button>Foundation ready</Button>
        </header>

        <Card aria-labelledby="foundation-heading">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm font-semibold text-brand-700">Phase 1</p>
              <h2 id="foundation-heading" className="mt-2 text-2xl font-bold text-ink-900">
                Shared UI, API client, strict TypeScript, and Tailwind tokens are wired.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600">
                This temporary screen exists only to verify the foundation styling before
                feature pages are built.
              </p>
            </div>
            <div className="grid gap-3 rounded-lg bg-surface-muted p-4">
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
    </main>
  )
}

export default App

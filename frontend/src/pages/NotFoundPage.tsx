import { useEffect } from 'react'
import { SearchX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/hooks/useAuth'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const destination = isAuthenticated ? '/dashboard' : '/'
  const destinationLabel = isAuthenticated ? 'Go to Dashboard' : 'Go to Home'

  useEffect(() => {
    document.title = '404 | Supervisor AI'
  }, [])

  return (
    <main className="grid min-h-screen place-items-center bg-surface-page px-5 py-12 text-ink-900 sm:px-8">
      <section aria-labelledby="not-found-title" className="w-full max-w-xl rounded-2xl border border-border-subtle bg-surface-card p-8 text-center shadow-sm sm:p-12">
        <SearchX aria-hidden="true" className="mx-auto size-12 text-primary-600" />
        <p className="mt-6 text-6xl font-bold tracking-tight text-primary-700 sm:text-7xl">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl" id="not-found-title">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-600 sm:text-base">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => navigate(destination)}>{destinationLabel}</Button>
          <Button onClick={() => navigate(-1)} variant="secondary">Go Back</Button>
        </div>
      </section>
    </main>
  )
}

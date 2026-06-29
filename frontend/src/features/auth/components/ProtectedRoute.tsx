import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '../../../components/shared/LoadingState'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-page p-6">
        <LoadingState label="Checking your session" />
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}

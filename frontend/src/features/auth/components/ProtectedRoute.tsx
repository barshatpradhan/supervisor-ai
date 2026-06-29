import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '../../../components/shared/LoadingState'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/auth'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth()
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

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate replace to="/forbidden" />
  }

  return <Outlet />
}

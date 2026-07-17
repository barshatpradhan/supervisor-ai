import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '../types/auth'
import { useAuth } from '../hooks/useAuth'

interface RoleGuardProps {
  allowedRoles: UserRole[]
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { platformRole, user } = useAuth()

  if (!user) {
    return <Navigate replace to="/login" />
  }

  const effectiveRole: UserRole | null =
    platformRole === 'platform_admin' ? 'admin' : user.role

  if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
    return <Navigate replace to="/forbidden" />
  }

  return <Outlet />
}

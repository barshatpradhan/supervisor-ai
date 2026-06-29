import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '../types/auth'
import { useAuth } from '../hooks/useAuth'

interface RoleGuardProps {
  allowedRoles: UserRole[]
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate replace to="/login" />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate replace to="/forbidden" />
  }

  return <Outlet />
}

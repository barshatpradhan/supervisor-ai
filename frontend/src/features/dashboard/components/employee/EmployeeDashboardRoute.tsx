import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../auth/hooks/useAuth'
import { EmployeeDashboardModule } from './EmployeeDashboardModule'

export function EmployeeDashboardRoute() {
  const { role } = useAuth()

  if (role !== 'employee') {
    return <Navigate replace to="/forbidden" />
  }

  return <EmployeeDashboardModule />
}

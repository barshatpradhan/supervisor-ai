import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'
import { EmployeeDashboardRoute } from './employee/EmployeeDashboardRoute'
import { SupervisorDashboardRoute } from './SupervisorDashboardRoute'

export function DashboardRoute() {
  const { role } = useAuth()

  if (role === 'admin' || role === 'supervisor') {
    return <SupervisorDashboardRoute />
  }

  if (role === 'employee') {
    return <EmployeeDashboardRoute />
  }

  return <Navigate replace to="/forbidden" />
}

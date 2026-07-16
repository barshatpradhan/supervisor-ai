import { Navigate } from 'react-router-dom'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { EmployeeDashboardRoute } from './employee/EmployeeDashboardRoute'
import { SupervisorDashboardRoute } from './SupervisorDashboardRoute'

export function DashboardRoute() {
  const { activeRole } = useOrganization()

  if (activeRole === 'organization_admin' || activeRole === 'supervisor') {
    return <SupervisorDashboardRoute />
  }

  if (activeRole === 'employee') {
    return <EmployeeDashboardRoute />
  }

  return <Navigate replace to="/forbidden" />
}

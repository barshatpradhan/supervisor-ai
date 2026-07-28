import { Navigate } from 'react-router-dom'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { EmployeeDashboardRoute } from './employee/EmployeeDashboardRoute'
import { SupervisorDashboardRoute } from './SupervisorDashboardRoute'

export function DashboardRoute() {
  const { activeMembershipRole } = useOrganization()

  if (
    activeMembershipRole === 'organization_admin' ||
    activeMembershipRole === 'supervisor'
  ) {
    return <SupervisorDashboardRoute />
  }

  if (activeMembershipRole === 'employee') {
    return <EmployeeDashboardRoute />
  }

  return <Navigate replace to="/forbidden" />
}

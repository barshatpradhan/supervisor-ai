import { Navigate } from 'react-router-dom'
import { useOrganization } from '../../../organizations/hooks/useOrganization'
import { EmployeeDashboardModule } from './EmployeeDashboardModule'

export function EmployeeDashboardRoute() {
  const { activeMembershipRole } = useOrganization()

  if (activeMembershipRole !== 'employee') {
    return <Navigate replace to="/forbidden" />
  }

  return <EmployeeDashboardModule />
}

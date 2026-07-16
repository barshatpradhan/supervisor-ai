import { Navigate } from 'react-router-dom'
import { useOrganization } from '../../../organizations/hooks/useOrganization'
import { EmployeeDashboardModule } from './EmployeeDashboardModule'

export function EmployeeDashboardRoute() {
  const { activeRole } = useOrganization()

  if (activeRole !== 'employee') {
    return <Navigate replace to="/forbidden" />
  }

  return <EmployeeDashboardModule />
}

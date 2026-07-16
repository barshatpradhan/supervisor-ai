import { EmptyState } from '../../../components/shared/EmptyState'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { SupervisorDashboardModule } from './SupervisorDashboardModule'

export function SupervisorDashboardRoute() {
  const { activeRole } = useOrganization()

  if (activeRole !== 'organization_admin' && activeRole !== 'supervisor') {
    return (
      <EmptyState
        description="Supervisor dashboard data is currently available only for supervisor and organization admin memberships."
        title="Dashboard is not available for this role"
      />
    )
  }

  return <SupervisorDashboardModule />
}

import { EmptyState } from '../../../components/shared/EmptyState'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { SupervisorDashboardModule } from './SupervisorDashboardModule'

export function SupervisorDashboardRoute() {
  const { activeMembershipRole } = useOrganization()

  if (
    activeMembershipRole !== 'organization_admin' &&
    activeMembershipRole !== 'supervisor'
  ) {
    return (
      <EmptyState
        description="Supervisor dashboard data is currently available only for supervisor and organization admin memberships."
        title="Dashboard is not available for this role"
      />
    )
  }

  return <SupervisorDashboardModule />
}

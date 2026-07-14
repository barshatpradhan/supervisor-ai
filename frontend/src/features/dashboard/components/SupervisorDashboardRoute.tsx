import { EmptyState } from '../../../components/shared/EmptyState'
import { useAuth } from '../../auth/hooks/useAuth'
import { SupervisorDashboardModule } from './SupervisorDashboardModule'

export function SupervisorDashboardRoute() {
  const { role } = useAuth()

  if (role !== 'admin' && role !== 'supervisor') {
    return (
      <EmptyState
        description="Supervisor dashboard data is currently available only for supervisor and admin accounts."
        title="Dashboard is not available for this role"
      />
    )
  }

  return <SupervisorDashboardModule />
}

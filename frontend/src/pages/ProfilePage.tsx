import { EmptyState } from '../components/shared/EmptyState'
import { EmployeeProfileModule } from '../features/employees/components/EmployeeProfileModule'
import { useOrganization } from '../features/organizations/hooks/useOrganization'
import { SupervisorProfileModule } from '../features/supervisors/components/SupervisorProfileModule'

export function ProfilePage() {
  const { activeMembershipRole } = useOrganization()

  if (activeMembershipRole === 'employee') {
    return <EmployeeProfileModule />
  }

  if (
    activeMembershipRole === 'organization_admin' ||
    activeMembershipRole === 'supervisor'
  ) {
    return <SupervisorProfileModule />
  }

  return (
    <EmptyState
      description="Select an active organization membership to open the matching profile workspace."
      title="Profile is not available"
    />
  )
}

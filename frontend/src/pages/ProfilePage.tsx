import { EmptyState } from '../components/shared/EmptyState'
import { EmployeeProfileModule } from '../features/employees/components/EmployeeProfileModule'
import { useOrganization } from '../features/organizations/hooks/useOrganization'
import { SupervisorProfileModule } from '../features/supervisors/components/SupervisorProfileModule'

export function ProfilePage() {
  const { activeRole } = useOrganization()

  if (activeRole === 'employee') {
    return <EmployeeProfileModule />
  }

  if (activeRole === 'organization_admin' || activeRole === 'supervisor') {
    return <SupervisorProfileModule />
  }

  return (
    <EmptyState
      description="Select an active organization membership to open the matching profile workspace."
      title="Profile is not available"
    />
  )
}

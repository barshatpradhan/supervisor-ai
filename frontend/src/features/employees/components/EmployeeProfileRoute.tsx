import { EmptyState } from '../../../components/shared/EmptyState'
import { useAuth } from '../../auth/hooks/useAuth'
import { EmployeeProfileModule } from './EmployeeProfileModule'

export function EmployeeProfileRoute() {
  const { role } = useAuth()

  if (role !== 'employee') {
    return (
      <EmptyState
        description="The current profile screen is implemented for employee accounts only. Supervisor and admin profile management has not been added in this phase."
        title="Profile module not available for this role"
      />
    )
  }

  return <EmployeeProfileModule />
}

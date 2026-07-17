import { Card } from '../components/ui/Card'
import { PlaceholderScreen } from '../components/shared/PlaceholderScreen'
import { PendingInvitationsList } from '../features/invitations/components/PendingInvitationsList'
import { useOrganization } from '../features/organizations/hooks/useOrganization'

export function EmployeesPage() {
  const { activeRole } = useOrganization()

  return (
    <div className="grid gap-6">
      {activeRole === 'organization_admin' ? <PendingInvitationsList /> : null}

      <Card>
        <PlaceholderScreen
          description="Employee capacity, skills, and work settings will be added in a later phase."
          title="Employees placeholder"
        />
      </Card>
    </div>
  )
}

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { InviteMemberDialog } from '../features/invitations/components/InviteMemberDialog'
import { PendingInvitationsList } from '../features/invitations/components/PendingInvitationsList'
import { useOrganization } from '../features/organizations/hooks/useOrganization'

export function OrganizationInvitationsPage() {
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const canInvite = activeMembershipRole === 'organization_admin'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          canInvite ? (
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus aria-hidden="true" size={16} />
              Invite member
            </Button>
          ) : null
        }
        subtitle={`Invite supervisors and employees to ${activeOrganization?.name ?? 'this workspace'}.`}
        title="Invitations"
      />

      <InviteMemberDialog
        isOpen={isDialogOpen}
        onCancel={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setIsDialogOpen(false)
          setRefreshKey((current) => current + 1)
        }}
      />

      <PendingInvitationsList refreshKey={refreshKey} showHeader={false} />
    </div>
  )
}

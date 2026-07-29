import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { InviteMemberButton } from '../features/invitations/components/InviteMemberButton'
import { InviteMemberDialog } from '../features/invitations/components/InviteMemberDialog'
import { PendingInvitationsList } from '../features/invitations/components/PendingInvitationsList'
import { useOrganization } from '../features/organizations/hooks/useOrganization'

export function OrganizationInvitationsPage() {
  const { activeMembershipRole } = useOrganization()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const canInvite = activeMembershipRole === 'organization_admin'

  function handleInvitationCreated() {
    setIsDialogOpen(false)
    setRefreshKey((current) => current + 1)
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Organization invitations
            </p>
            <h1 className="mt-2 text-3xl font-bold text-ink-900">
              Invite supervisors and employees
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
              Create and manage organization invitations using the active membership role and
              current workspace context.
            </p>
          </div>

          {canInvite ? (
            <InviteMemberButton
              onClick={() => {
                setIsDialogOpen(true)
              }}
            />
          ) : null}
        </div>

        <InviteMemberDialog
          isOpen={isDialogOpen}
          onCancel={() => {
            setIsDialogOpen(false)
          }}
          onSuccess={() => {
            handleInvitationCreated()
          }}
        />
      </Card>

      <PendingInvitationsList refreshKey={refreshKey} showHeader={false} />
    </div>
  )
}

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useMemo, useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Dialog } from '../../../components/ui/Dialog'
import { StateBlock } from '../../../components/ui/StateBlock'
import { useNotifications } from '../../../hooks/useNotifications'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { usePendingInvitations } from '../hooks/usePendingInvitations'
import { formatInvitationDate, getInvitationRoleLabel } from '../utils/invitationPresentation'

interface PendingInvitationsListProps {
  refreshKey?: number
  showHeader?: boolean
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(value))
}

function daysUntil(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)
}

function ExpiryLabel({ expiresAt }: { expiresAt: string }) {
  const days = daysUntil(expiresAt)
  const isSoon = days <= 2
  return (
    <span className="flex flex-col">
      <span className={['num-sm', isSoon ? 'text-danger-fg' : 'text-text-primary'].join(' ')}>
        {days <= 0 ? 'Expired' : days === 1 ? 'In 1 day' : `In ${days} days`}
      </span>
      <span className="helper text-text-tertiary">{formatInvitationDate(expiresAt)}</span>
    </span>
  )
}

export function PendingInvitationsList({ refreshKey = 0, showHeader = true }: PendingInvitationsListProps) {
  const notifications = useNotifications()
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const organizationId = activeOrganization?.id ?? null
  const canManageInvitations = activeMembershipRole === 'organization_admin'
  const { error, invitations, isLoading, mutatingInvitationId, refresh, resend, revoke } =
    usePendingInvitations(organizationId, canManageInvitations, refreshKey)
  const [revoking, setRevoking] = useState<{ email: string; id: string } | null>(null)

  const sortedInvitations = useMemo(
    () => invitations.slice().sort((left, right) => new Date(right.invited_at).getTime() - new Date(left.invited_at).getTime()),
    [invitations],
  )

  if (!canManageInvitations) {
    return null
  }

  async function handleResend(invitationId: string) {
    try {
      await resend(invitationId)
      notifications.success({ message: 'A fresh link was sent and the previous link stopped working.', title: 'Invitation resent' })
    } catch (caughtError) {
      notifications.error({ message: caughtError instanceof Error ? caughtError.message : 'Unable to resend this invitation.', title: 'Resend failed' })
    }
  }

  async function confirmRevoke() {
    if (!revoking) return
    const { id } = revoking
    setRevoking(null)
    try {
      await revoke(id)
      notifications.success({ message: 'The invitation link no longer works.', title: 'Invitation revoked' })
    } catch (caughtError) {
      notifications.error({ message: caughtError instanceof Error ? caughtError.message : 'Unable to revoke this invitation.', title: 'Revoke failed' })
    }
  }

  return (
    <Card aria-labelledby="pending-invitations-title" className="flex flex-col" padding="flush">
      <div className="px-5 pb-3 pt-5">
        <CardHeader
          action={<Button className="min-h-8 px-2.5" onClick={() => { void refresh() }} variant="ghost">Refresh</Button>}
          helper={showHeader ? 'Resend a fresh link, or revoke access before it is accepted' : 'Newest first'}
          id="pending-invitations-title"
          title={
            <>
              Pending invitations{' '}
              {sortedInvitations.length > 0 ? <span className="num-sm text-text-tertiary">{sortedInvitations.length}</span> : null}
            </>
          }
        />
      </div>

      {error ? (
        <StateBlock action={<Button onClick={() => { void refresh() }} variant="secondary">Retry</Button>} compact kind="error">
          {error}
        </StateBlock>
      ) : null}
      {isLoading ? <div className="px-5 pb-5"><StateBlock compact kind="loading" title="Loading pending invitations" /></div> : null}
      {!isLoading && !error && sortedInvitations.length === 0 ? (
        <StateBlock compact title="No pending invitations">Invitations you send appear here until they are accepted.</StateBlock>
      ) : null}

      {sortedInvitations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="body w-full min-w-[680px] border-collapse text-left">
            <thead className="bg-surface-muted">
              <tr>
                <th className="label px-5 py-2.5 text-text-secondary" scope="col">Invited person</th>
                <th className="label px-3 py-2.5 text-text-secondary" scope="col">Invited</th>
                <th className="label px-3 py-2.5 text-text-secondary" scope="col">Expires</th>
                <th className="label px-3 py-2.5 text-text-secondary" scope="col">Sent</th>
                <th className="label px-5 py-2.5 text-right text-text-secondary" scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {sortedInvitations.map((invitation) => {
                const isMutating = mutatingInvitationId === invitation.invitation_id
                return (
                  <tr className="border-t border-chart-grid" key={invitation.invitation_id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={invitation.email} size={32} />
                        <div className="min-w-0">
                          <div className="body-strong truncate text-text-primary">{invitation.email}</div>
                          <div className="helper text-text-tertiary">{getInvitationRoleLabel(invitation.role)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num-sm px-3 py-3 text-text-primary">{formatShortDate(invitation.invited_at)}</td>
                    <td className="px-3 py-3"><ExpiryLabel expiresAt={invitation.expires_at} /></td>
                    <td className="num-sm px-3 py-3 text-text-primary">{invitation.send_count}×</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button disabled={isMutating} onClick={() => { void handleResend(invitation.invitation_id) }} variant="secondary">
                          {isMutating ? 'Working…' : 'Resend'}
                        </Button>
                        <Button
                          disabled={isMutating}
                          onClick={() => setRevoking({ email: invitation.email, id: invitation.invitation_id })}
                          variant="ghost"
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <DialogPrimitive.Root onOpenChange={(open) => { if (!open) setRevoking(null) }} open={revoking !== null}>
        <Dialog description="The invitation link stops working immediately." title="Revoke this invitation?">
          <div className="flex flex-col gap-5">
            <p className="body m-0 text-text-primary">
              <strong>{revoking?.email}</strong> will no longer be able to join with the link they were sent. You can invite them again later.
            </p>
            <div className="flex justify-end gap-3">
              <DialogPrimitive.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogPrimitive.Close>
              <Button onClick={() => { void confirmRevoke() }} variant="danger">Revoke invitation</Button>
            </div>
          </div>
        </Dialog>
      </DialogPrimitive.Root>
    </Card>
  )
}

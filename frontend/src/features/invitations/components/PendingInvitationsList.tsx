import { useMemo } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { EmptyState } from '../../../components/shared/EmptyState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useNotifications } from '../../../hooks/useNotifications'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { usePendingInvitations } from '../hooks/usePendingInvitations'
import {
  formatInvitationDate,
  getInvitationRoleLabel,
} from '../utils/invitationPresentation'

interface PendingInvitationsListProps {
  refreshKey?: number
  showHeader?: boolean
}

export function PendingInvitationsList({
  refreshKey = 0,
  showHeader = true,
}: PendingInvitationsListProps) {
  const notifications = useNotifications()
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const organizationId = activeOrganization?.id ?? null
  const canManageInvitations = activeMembershipRole === 'organization_admin'
  const {
    error,
    invitations,
    isLoading,
    mutatingInvitationId,
    refresh,
    resend,
    revoke,
  } = usePendingInvitations(organizationId, canManageInvitations, refreshKey)

  const sortedInvitations = useMemo(
    () =>
      invitations.slice().sort((left, right) => {
        return new Date(right.invited_at).getTime() - new Date(left.invited_at).getTime()
      }),
    [invitations],
  )

  if (!canManageInvitations) {
    return null
  }

  async function handleResend(invitationId: string) {
    try {
      await resend(invitationId)
      notifications.success({
        message: 'A fresh invitation link was sent and the previous link was invalidated.',
        title: 'Invitation resent',
      })
    } catch (caughtError) {
      notifications.error({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to resend this invitation.',
        title: 'Resend failed',
      })
    }
  }

  async function handleRevoke(invitationId: string, email: string) {
    const confirmed = window.confirm(
      `Revoke the pending invitation for ${email}? This link will stop working immediately.`,
    )

    if (!confirmed) {
      return
    }

    try {
      await revoke(invitationId)
      notifications.success({
        message: 'The invitation was revoked and the pending membership was suspended.',
        title: 'Invitation revoked',
      })
    } catch (caughtError) {
      notifications.error({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to revoke this invitation.',
        title: 'Revoke failed',
      })
    }
  }

  return (
    <Card className="grid gap-5">
      {showHeader ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            Pending invitations
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink-900">
            Organization invite management
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            Review open employee and supervisor invitations, resend fresh links, or revoke
            access before it is accepted.
          </p>
        </div>
      ) : null}

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            void refresh()
          }}
          title="Unable to load pending invitations"
        />
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4 text-sm text-ink-600">
          Loading pending invitations...
        </div>
      ) : null}

      {!isLoading && sortedInvitations.length === 0 ? (
        <EmptyState
          description="Open invitations will appear here after your organization starts inviting supervisors or employees."
          title="No pending invitations"
        />
      ) : null}

      {sortedInvitations.length > 0 ? (
        <div className="grid gap-3">
          {sortedInvitations.map((invitation) => {
            const isMutating = mutatingInvitationId === invitation.invitation_id

            return (
              <article
                className="rounded-lg border border-border-subtle bg-surface-card-alt p-4"
                key={invitation.invitation_id}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink-900">{invitation.email}</p>
                      <span className="inline-flex rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning-text">
                        Pending
                      </span>
                    </div>
                    <dl className="grid gap-2 text-sm text-ink-600 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="font-medium text-ink-500">Role</dt>
                        <dd>{getInvitationRoleLabel(invitation.role)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-ink-500">Invited</dt>
                        <dd>{formatInvitationDate(invitation.invited_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-ink-500">Expires</dt>
                        <dd>{formatInvitationDate(invitation.expires_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-ink-500">Send count</dt>
                        <dd>{invitation.send_count}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      disabled={isMutating}
                      onClick={() => {
                        void handleResend(invitation.invitation_id)
                      }}
                      type="button"
                      variant="secondary"
                    >
                      {isMutating ? 'Working...' : 'Resend'}
                    </Button>
                    <Button
                      disabled={isMutating}
                      onClick={() => {
                        void handleRevoke(invitation.invitation_id, invitation.email)
                      }}
                      type="button"
                      variant="secondary"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </Card>
  )
}

import { formatOrganizationRole } from '../../organizations/utils/organizationPresentation'
import type {
  InvitationPublicStatus,
  OrganizationInvitationSummary,
} from '../types/invitation'

export function formatInvitationDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getInvitationStatusLabel(status: InvitationPublicStatus) {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'expired':
      return 'Expired'
    case 'revoked':
      return 'Revoked'
    case 'accepted':
      return 'Accepted'
    default:
      return status
  }
}

export function getInvitationStatusTone(status: InvitationPublicStatus) {
  switch (status) {
    case 'pending':
      return 'border-warning-fg/30 bg-warning-bg/50 text-warning-text'
    case 'expired':
      return 'border-danger-100 bg-danger-50 text-danger-700'
    case 'revoked':
      return 'border-danger-100 bg-danger-50 text-danger-700'
    case 'accepted':
      return 'border-success-200 bg-success-100 text-success-700'
    default:
      return 'border-border-subtle bg-surface-card-alt text-ink-700'
  }
}

export function deriveInvitationStatus(
  invitation: Pick<
    OrganizationInvitationSummary,
    'accepted_at' | 'expires_at' | 'membership_status' | 'revoked_at'
  >,
) {
  if (invitation.accepted_at) {
    return 'accepted' satisfies InvitationPublicStatus
  }

  if (invitation.revoked_at) {
    return 'revoked' satisfies InvitationPublicStatus
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return 'expired' satisfies InvitationPublicStatus
  }

  if (invitation.membership_status === 'invited') {
    return 'pending' satisfies InvitationPublicStatus
  }

  return 'pending' satisfies InvitationPublicStatus
}

export function getInvitationRoleLabel(role: OrganizationInvitationSummary['role']) {
  return formatOrganizationRole(role)
}

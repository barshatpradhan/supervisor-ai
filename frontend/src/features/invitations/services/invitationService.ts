import { getJson, postJson } from '../../../lib/api'
import type {
  CreateOrganizationInvitationRequest,
  InvitationAcceptance,
  InvitationInspection,
  OrganizationInvitationMutationResponse,
  OrganizationInvitationSummary,
} from '../types/invitation'

export function inspectInvitation(token: string) {
  return getJson<InvitationInspection>(`/invitations/${encodeURIComponent(token)}`, {
    skipOrganizationContext: true,
  })
}

export function acceptInvitation(token: string) {
  return postJson<InvitationAcceptance>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    undefined,
    {
      skipOrganizationContext: true,
    },
  )
}

export function listOrganizationInvitations(organizationId: string) {
  return getJson<OrganizationInvitationSummary[]>(
    `/organizations/${organizationId}/invitations`,
  )
}

export function createOrganizationInvitation(
  organizationId: string,
  request: CreateOrganizationInvitationRequest,
) {
  return postJson<OrganizationInvitationMutationResponse, CreateOrganizationInvitationRequest>(
    `/organizations/${organizationId}/invitations`,
    request,
  )
}

export function resendOrganizationInvitation(
  organizationId: string,
  invitationId: string,
) {
  return postJson<OrganizationInvitationMutationResponse>(
    `/organizations/${organizationId}/invitations/${invitationId}/resend`,
  )
}

export function revokeOrganizationInvitation(
  organizationId: string,
  invitationId: string,
) {
  return postJson<OrganizationInvitationMutationResponse>(
    `/organizations/${organizationId}/invitations/${invitationId}/revoke`,
  )
}

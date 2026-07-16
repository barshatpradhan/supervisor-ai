import { getJson, postJson } from '../../../lib/api'
import type {
  CreateOrganizationRequest,
  CurrentUserOrganizationListItem,
  OrganizationCreationResponse,
} from '../types/organization'

export function listCurrentUserOrganizations() {
  return getJson<CurrentUserOrganizationListItem[]>('/organizations', {
    skipOrganizationContext: true,
  })
}

export function createOrganization(request: CreateOrganizationRequest) {
  return postJson<OrganizationCreationResponse, CreateOrganizationRequest>(
    '/organizations',
    request,
    {
      skipOrganizationContext: true,
    },
  )
}

export function acceptOrganizationInvitation(organizationId: string) {
  return postJson<OrganizationCreationResponse>('/organizations/invitations/accept', undefined, {
    headers: {
      'X-Organization-Id': organizationId,
    },
    skipOrganizationContext: true,
  })
}

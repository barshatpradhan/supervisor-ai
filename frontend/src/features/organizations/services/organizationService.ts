import { getJson, postJson } from '../../../lib/api'
import type {
  BackendOrganizationMemberSummary,
} from '../../../types/backend'
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

export function listOrganizationMembers(organizationId: string) {
  return getJson<BackendOrganizationMemberSummary[]>(`/organizations/${organizationId}/members`)
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

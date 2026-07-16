import type {
  BackendCreateOrganizationRequest,
  BackendCurrentUserOrganizationListItem,
  BackendOrganizationMembershipRole,
  BackendOrganizationMembershipStatus,
  BackendOrganizationCreationResponse,
} from '../../../types/backend'

export type OrganizationMembershipRole = BackendOrganizationMembershipRole
export type OrganizationMembershipStatus = BackendOrganizationMembershipStatus
export type CurrentUserOrganizationListItem = BackendCurrentUserOrganizationListItem
export type CreateOrganizationRequest = BackendCreateOrganizationRequest
export type OrganizationCreationResponse = BackendOrganizationCreationResponse

export interface OrganizationContextValue {
  organizations: CurrentUserOrganizationListItem[]
  activeMembership: CurrentUserOrganizationListItem['membership'] | null
  activeOrganization: CurrentUserOrganizationListItem['organization'] | null
  activeRole: OrganizationMembershipRole | null
  isLoading: boolean
  error: string | null
  selectOrganization: (organizationId: string | null) => void
  refreshOrganizations: () => Promise<CurrentUserOrganizationListItem[]>
  clearOrganization: () => void
}

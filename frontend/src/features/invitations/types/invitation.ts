import type {
  BackendInvitationAcceptanceResponse,
  BackendInvitationInspectionResponse,
  BackendInvitationPublicStatus,
  BackendOrganizationInvitationMutationResponse,
  BackendOrganizationInvitationSummary,
} from '../../../types/backend'

export type InvitationPublicStatus = BackendInvitationPublicStatus
export type InvitationInspection = BackendInvitationInspectionResponse
export type InvitationAcceptance = BackendInvitationAcceptanceResponse
export type OrganizationInvitationSummary = BackendOrganizationInvitationSummary
export type OrganizationInvitationMutationResponse = BackendOrganizationInvitationMutationResponse

export interface PendingInvitationItem extends OrganizationInvitationSummary {
  derivedStatus: InvitationPublicStatus
}

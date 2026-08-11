import type {
  BackendCreateOrganizationInvitationRequest,
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
export type CreateOrganizationInvitationRequest = BackendCreateOrganizationInvitationRequest

export type InvitationRole = CreateOrganizationInvitationRequest['role']

export interface InviteMemberFormValues {
  email: string
  role: InvitationRole
  fullName: string
  jobTitle: string
  bio: string
  employmentType: '' | 'full_time' | 'part_time'
  weeklyCapacityHours: string
  department: string
}

export interface InviteMemberFormErrors {
  email?: string
  role?: string
  fullName?: string
  weeklyCapacityHours?: string
}

export interface PendingInvitationItem extends OrganizationInvitationSummary {
  derivedStatus: InvitationPublicStatus
}

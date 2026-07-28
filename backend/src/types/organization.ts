export type OrganizationMembershipRole =
  | "organization_admin"
  | "supervisor"
  | "employee";

export type OrganizationMembershipStatus = "invited" | "active" | "suspended";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
  invited_by_user_id: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface OrganizationContext {
  organization: Organization;
  membership: OrganizationMembership;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

export interface OrganizationInvitationSkillInput {
  name: string;
  proficiency_level?: number;
  years_of_experience?: number | null;
}

export interface EmployeeInvitationProfileInput {
  full_name: string;
  bio?: string;
  employment_type?: "full_time" | "part_time";
  weekly_capacity_hours?: number;
  skills?: OrganizationInvitationSkillInput[];
}

export interface SupervisorInvitationProfileInput {
  full_name: string;
  department?: string;
  bio?: string;
}

export interface CreateOrganizationInvitationInput {
  email: string;
  role: Extract<OrganizationMembershipRole, "employee" | "supervisor">;
  profile: EmployeeInvitationProfileInput | SupervisorInvitationProfileInput;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  user_id: string | null;
  membership_id: string | null;
  email: string;
  role: Extract<OrganizationMembershipRole, "employee" | "supervisor">;
  profile: Record<string, unknown>;
  invited_by_user_id: string;
  invited_at: string;
  last_sent_at: string | null;
  send_count: number;
  expires_at: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  revoked_by_user_id: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface OrganizationMemberSummary {
  membership_id: string;
  user_id: string;
  email: string | null;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
  invited_at: string | null;
  joined_at: string | null;
  employee_profile_id: string | null;
  employee_full_name: string | null;
  supervisor_profile_id: string | null;
  supervisor_full_name: string | null;
}

export interface OrganizationInvitationSummary {
  invitation_id: string;
  membership_id: string | null;
  email: string;
  role: Extract<OrganizationMembershipRole, "employee" | "supervisor">;
  invited_at: string;
  last_sent_at: string | null;
  send_count: number;
  expires_at: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  revoked_by_user_id: string | null;
  revoked_at: string | null;
  membership_status: OrganizationMembershipStatus;
}

export interface CurrentUserOrganizationMembershipSummary {
  id: string;
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface CurrentUserOrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface CurrentUserOrganizationInvitationSummary {
  id: string;
  expires_at: string;
}

export interface CurrentUserOrganizationListItem {
  membership: CurrentUserOrganizationMembershipSummary;
  organization: CurrentUserOrganizationSummary;
  invitation: CurrentUserOrganizationInvitationSummary | null;
}

export type InvitationPublicStatus = "pending" | "expired" | "revoked" | "accepted";

export interface InvitationInspectionResult {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  invited_email_masked: string;
  role: Extract<OrganizationMembershipRole, "employee" | "supervisor">;
  expires_at: string;
  status: InvitationPublicStatus;
  authentication_required: boolean;
  current_user_email_matches: boolean | null;
}

export interface InvitationAcceptanceResult {
  organization: Organization;
  membership: OrganizationMembership;
  profileCreated: boolean;
}

export interface OrganizationInvitationMutationResult {
  invitation: OrganizationInvitation;
  membership: OrganizationMembership | null;
}

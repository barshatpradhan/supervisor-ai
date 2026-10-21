export interface OrganizationInvitationEmailInput {
  to: string;
  organizationName: string;
  invitedRole: "employee" | "supervisor";
  invitedByName?: string;
  acceptanceUrl: string;
  expiresAt: string;
  invitationId?: string;
  organizationId?: string;
}

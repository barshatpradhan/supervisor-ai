export interface OrganizationVerificationScenario {
  id: string;
  description: string;
  requestMechanism: string;
  expectedOutcome: string;
}

export const organizationVerificationScenarios: OrganizationVerificationScenario[] = [
  {
    id: "organization-admin-create",
    description: "Organization admin can create an organization without an active membership.",
    requestMechanism: "POST /api/v1/organizations with a bearer token and no X-Organization-Id header.",
    expectedOutcome: "201 Created with an active organization_admin membership for the creator.",
  },
  {
    id: "admin-invite-employee-supervisor",
    description: "Organization admin can invite both employee and supervisor memberships.",
    requestMechanism:
      "POST /api/v1/organizations/:organizationId/invitations with X-Organization-Id matching the route parameter.",
    expectedOutcome: "201 Created with invited membership and invitation metadata.",
  },
  {
    id: "non-admin-cannot-invite",
    description: "Supervisor or employee memberships cannot invite users.",
    requestMechanism:
      "POST /api/v1/organizations/:organizationId/invitations with a non-admin active membership.",
    expectedOutcome: "403 Forbidden.",
  },
  {
    id: "invited-user-blocked-before-acceptance",
    description: "Invited members cannot access organization-scoped tenant data before acceptance.",
    requestMechanism:
      "GET /api/v1/projects or GET /api/v1/organizations/:organizationId/members with an invited membership and X-Organization-Id.",
    expectedOutcome: "403 Forbidden until POST /api/v1/organizations/invitations/accept succeeds.",
  },
  {
    id: "cross-organization-project-isolation",
    description: "Active users in Organization A cannot read Organization B projects.",
    requestMechanism: "GET /api/v1/projects with X-Organization-Id set to Organization B.",
    expectedOutcome: "403 Forbidden or an organization membership error.",
  },
  {
    id: "cross-organization-invite-blocked",
    description: "Organization admin A cannot invite into Organization B.",
    requestMechanism:
      "POST /api/v1/organizations/:organizationId/invitations with X-Organization-Id set to an organization where the caller is not an active admin.",
    expectedOutcome: "403 Forbidden.",
  },
  {
    id: "suspended-membership-blocked",
    description: "Suspended members cannot access tenant-scoped routes.",
    requestMechanism:
      "GET /api/v1/projects or GET /api/v1/organizations/:organizationId with X-Organization-Id for a suspended membership.",
    expectedOutcome: "403 Forbidden.",
  },
  {
    id: "multi-organization-role-variance",
    description: "One user can hold different membership roles in different organizations.",
    requestMechanism:
      "Resolve two active memberships for the same user with different X-Organization-Id values.",
    expectedOutcome: "Authorization follows membership role from the selected organization, not users.role.",
  },
  {
    id: "employee-directory-scope",
    description: "Employee directory returns only the selected organization.",
    requestMechanism:
      "GET /api/v1/supervisors/employees with X-Organization-Id for Organization A and then Organization B.",
    expectedOutcome: "Each response includes only employees whose organization_id matches the selected organization.",
  },
  {
    id: "project-api-scope",
    description: "Project list, create, get, and update operate only within the selected organization.",
    requestMechanism:
      "Use GET/POST/PATCH /api/v1/projects with a verified X-Organization-Id header.",
    expectedOutcome:
      "Projects are inserted with the selected organization_id and only returned when the caller is an active member of that organization.",
  },
];

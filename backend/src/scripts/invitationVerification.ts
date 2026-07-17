process.env.INVITATION_DEBUG_RETURN_URL =
  process.env.INVITATION_DEBUG_RETURN_URL ?? "true";

import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { supabase } from "../config/supabase.js";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    platformRole: "platform_admin" | null;
  };
  onboarding: {
    hasActiveOrganization: boolean;
    requiresOrganizationCreation: boolean;
    hasPendingInvitations: boolean;
  };
  accessToken: string;
}

interface OrganizationBootstrapResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    role: "organization_admin" | "supervisor" | "employee";
    status: "active" | "invited" | "suspended";
    joined_at: string | null;
  };
}

interface InvitationAcceptanceResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    role: "organization_admin" | "supervisor" | "employee";
    status: "active" | "invited" | "suspended";
  };
  profileCreated: boolean;
}

interface InvitationInspectionResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  invited_email_masked: string;
  role: "employee" | "supervisor";
  expires_at: string;
  status: "pending" | "expired" | "revoked" | "accepted";
  authentication_required: boolean;
  current_user_email_matches: boolean | null;
}

interface OrganizationInvitationMutationResponse {
  invitation: {
    id: string;
    membership_id: string;
    email: string;
    send_count: number;
    revoked_at: string | null;
    accepted_at: string | null;
  };
  membership: {
    id: string;
    status: "active" | "invited" | "suspended";
  };
}

interface AppUserRow {
  id: string;
  auth_user_id: string;
  email: string | null;
}

type HttpMethod = "GET" | "POST";

interface RequestOptions {
  method?: HttpMethod;
  token?: string;
  organizationId?: string;
  body?: Record<string, unknown>;
  allowedStatuses?: number[];
}

const API_BASE_URL =
  process.env.TENANT_ISOLATION_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";
const TEST_PASSWORD = process.env.ONBOARDING_TEST_PASSWORD ?? "OnboardingTest123!";
const TEST_EMAIL_DOMAIN = "example.com";
const INVITATION_PROFILE_META_KEY = "__invitation_meta";

function logVerificationEvent(event: string, details: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      scope: "invitation_verification",
      event,
      ...details,
    })
  );
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ status: number; body: ApiEnvelope<T> }> {
  const headers = new Headers();
  const method = options.method ?? "GET";

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (options.organizationId) {
    headers.set("X-Organization-Id", options.organizationId);
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body,
  });
  const parsedBody = (await response.json()) as ApiEnvelope<T>;
  const allowedStatuses = options.allowedStatuses ?? [200];

  if (!allowedStatuses.includes(response.status)) {
    throw new Error(
      `Unexpected response for ${method} ${path}: ${response.status} ${parsedBody.message}`
    );
  }

  return {
    status: response.status,
    body: parsedBody,
  };
}

async function runScenario(id: string, execute: () => Promise<void>) {
  logVerificationEvent("scenario_start", { id });
  await execute();
  logVerificationEvent("scenario_pass", { id });
}

async function findAppUserByEmail(email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_user_id, email")
    .eq("email", email)
    .single<AppUserRow>();

  if (error || !data) {
    throw new Error(`Unable to resolve app user for ${email}.`);
  }

  return data;
}

async function register(email: string) {
  const response = await requestJson<AuthResponse>("/auth/register", {
    method: "POST",
    body: {
      email,
      password: TEST_PASSWORD,
    },
    allowedStatuses: [201],
  });

  assertCondition(response.body.data?.accessToken, `Registration failed for ${email}.`);
  return response.body.data;
}

async function login(email: string) {
  const response = await requestJson<AuthResponse>("/auth/login", {
    method: "POST",
    body: {
      email,
      password: TEST_PASSWORD,
    },
    allowedStatuses: [200],
  });

  assertCondition(response.body.data?.accessToken, `Login failed for ${email}.`);
  return response.body.data;
}

async function createOrganization(token: string, name: string, slug: string) {
  const response = await requestJson<OrganizationBootstrapResponse>("/organizations", {
    method: "POST",
    token,
    body: {
      name,
      slug,
    },
    allowedStatuses: [201],
  });

  assertCondition(response.body.data, `Organization creation failed for ${slug}.`);
  return response.body.data;
}

async function setPasswordForInvitedUser(email: string) {
  const appUser = await findAppUserByEmail(email);
  const { data, error } = await supabase.auth.admin.updateUserById(appUser.auth_user_id, {
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Unable to set password for invited user ${email}.`);
  }
}

function extractTokenFromAcceptanceUrl(acceptanceUrl: string) {
  const token = new URL(acceptanceUrl).searchParams.get("token");
  if (!token) {
    throw new Error("Invitation acceptance URL is missing the token.");
  }

  return token;
}

async function loadOrganizationService() {
  return import("../services/organizationService.js");
}

async function createInvitationWithDebugToken(input: {
  inviterAuthUserId: string;
  organizationId: string;
  email: string;
  role: "employee" | "supervisor";
  profile: Record<string, unknown>;
}) {
  const organizationService = await loadOrganizationService();
  const result = await organizationService.createOrganizationInvitation(
    input.inviterAuthUserId,
    input.organizationId,
    {
      email: input.email,
      role: input.role,
      profile: input.profile,
    } as never
  );

  assertCondition(
    result.debug?.acceptance_url,
    "Invitation debug acceptance URL was not returned."
  );

  return {
    ...result,
    token: extractTokenFromAcceptanceUrl(result.debug.acceptance_url),
  };
}

async function resendInvitationWithDebugToken(input: {
  inviterAuthUserId: string;
  organizationId: string;
  invitationId: string;
}) {
  const organizationService = await loadOrganizationService();
  const result = await organizationService.resendOrganizationInvitation(
    input.inviterAuthUserId,
    input.organizationId,
    input.invitationId
  );

  assertCondition(
    result.debug?.acceptance_url,
    "Invitation resend debug acceptance URL was not returned."
  );

  return {
    ...result,
    token: extractTokenFromAcceptanceUrl(result.debug.acceptance_url),
  };
}

async function updateInvitationExpiry(invitationId: string, expiresAt: string) {
  const { error } = await supabase
    .from("organization_invitations")
    .update({ expires_at: expiresAt })
    .eq("id", invitationId);

  if (error) {
    throw new Error(`Unable to update invitation expiry for ${invitationId}.`);
  }
}

async function updateInvitationLastSentAt(invitationId: string, lastSentAt: string) {
  const { data: existingInvitation, error: fetchError } = await supabase
    .from("organization_invitations")
    .select("profile")
    .eq("id", invitationId);

  if (fetchError || !existingInvitation || existingInvitation.length === 0) {
    throw new Error(`Unable to load invitation ${invitationId} for resend setup.`);
  }

  const currentProfile =
    (existingInvitation[0]?.profile as Record<string, unknown> | undefined) ?? {};
  const currentMetadata =
    typeof currentProfile[INVITATION_PROFILE_META_KEY] === "object" &&
    currentProfile[INVITATION_PROFILE_META_KEY] !== null
      ? (currentProfile[INVITATION_PROFILE_META_KEY] as Record<string, unknown>)
      : {};

  const { error } = await supabase
    .from("organization_invitations")
    .update({
      profile: {
        ...currentProfile,
        [INVITATION_PROFILE_META_KEY]: {
          ...currentMetadata,
          last_sent_at: lastSentAt,
        },
      },
    })
    .eq("id", invitationId);

  if (error) {
    throw new Error(`Unable to update last_sent_at for invitation ${invitationId}.`);
  }
}

async function getInvitationRow(invitationId: string) {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, profile, accepted_at, revoked_at")
    .eq("id", invitationId)
    .single<{
      id: string;
      profile: Record<string, unknown>;
      accepted_at: string | null;
      revoked_at: string | null;
    }>();

  if (error || !data) {
    throw new Error(`Unable to fetch invitation ${invitationId}.`);
  }

  const rawMetadata = data.profile[INVITATION_PROFILE_META_KEY];
  const metadata =
    typeof rawMetadata === "object" && rawMetadata !== null
      ? (rawMetadata as Record<string, unknown>)
      : {};

  return {
    id: data.id,
    token_hash: typeof metadata.token_hash === "string" ? metadata.token_hash : null,
    accepted_at: data.accepted_at,
    revoked_at: data.revoked_at,
    accepted_by_user_id:
      typeof metadata.accepted_by_user_id === "string"
        ? metadata.accepted_by_user_id
        : null,
    revoked_by_user_id:
      typeof metadata.revoked_by_user_id === "string"
        ? metadata.revoked_by_user_id
        : null,
  };
}

async function getMembershipRow(membershipId: string) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, status, joined_at")
    .eq("id", membershipId)
    .single<{
      id: string;
      status: "active" | "invited" | "suspended";
      joined_at: string | null;
    }>();

  if (error || !data) {
    throw new Error(`Unable to fetch membership ${membershipId}.`);
  }

  return data;
}

export async function verifyInvitationLifecycle() {
  const runId = crypto.randomUUID().slice(0, 8);
  const ownerAEmail = `invite-owner-a-${runId}@${TEST_EMAIL_DOMAIN}`;
  const ownerBEmail = `invite-owner-b-${runId}@${TEST_EMAIL_DOMAIN}`;
  const supervisorAEmail = `invite-supervisor-a-${runId}@${TEST_EMAIL_DOMAIN}`;
  const apiEmployeeEmail = `invite-api-employee-${runId}@${TEST_EMAIL_DOMAIN}`;
  const apiSupervisorEmail = `invite-api-supervisor-${runId}@${TEST_EMAIL_DOMAIN}`;
  const inspectEmployeeEmail = `invite-inspect-${runId}@${TEST_EMAIL_DOMAIN}`;
  const wrongUserEmail = `invite-wrong-${runId}@${TEST_EMAIL_DOMAIN}`;
  const expiredEmail = `invite-expired-${runId}@${TEST_EMAIL_DOMAIN}`;
  const revokedEmail = `invite-revoked-${runId}@${TEST_EMAIL_DOMAIN}`;
  const acceptedEmployeeEmail = `invite-accepted-employee-${runId}@${TEST_EMAIL_DOMAIN}`;
  const acceptedSupervisorEmail = `invite-accepted-supervisor-${runId}@${TEST_EMAIL_DOMAIN}`;
  const resendEmail = `invite-resend-${runId}@${TEST_EMAIL_DOMAIN}`;
  const crossOrgEmail = `invite-cross-org-${runId}@${TEST_EMAIL_DOMAIN}`;

  const ownerASession = await register(ownerAEmail);
  const ownerBSession = await register(ownerBEmail);
  const wrongUserSession = await register(wrongUserEmail);

  const ownerAOrganization = await createOrganization(
    ownerASession.accessToken,
    `Invitation Org A ${runId}`,
    `invitation-org-a-${runId}`
  );
  const ownerBOrganization = await createOrganization(
    ownerBSession.accessToken,
    `Invitation Org B ${runId}`,
    `invitation-org-b-${runId}`
  );

  const ownerAAppUser = await findAppUserByEmail(ownerAEmail);
  const ownerBAppUser = await findAppUserByEmail(ownerBEmail);

  const supervisorInvitation = await createInvitationWithDebugToken({
    inviterAuthUserId: ownerAAppUser.auth_user_id,
    organizationId: ownerAOrganization.organization.id,
    email: supervisorAEmail,
    role: "supervisor",
    profile: {
      full_name: "Invitation Supervisor A",
      department: "Engineering",
      bio: "Supervisor invite for permission checks",
    },
  });

  await setPasswordForInvitedUser(supervisorAEmail);
  const supervisorASession = await login(supervisorAEmail);
  await requestJson<InvitationAcceptanceResponse>(
    `/invitations/${supervisorInvitation.token}/accept`,
    {
      method: "POST",
      token: supervisorASession.accessToken,
      allowedStatuses: [200],
    }
  );

  await runScenario("organization-admin-can-create-employee-invitation", async () => {
    const response = await requestJson<OrganizationInvitationMutationResponse>(
      `/organizations/${ownerAOrganization.organization.id}/invitations`,
      {
        method: "POST",
        token: ownerASession.accessToken,
        organizationId: ownerAOrganization.organization.id,
        body: {
          email: apiEmployeeEmail,
          role: "employee",
          profile: {
            full_name: "API Employee Invite",
            bio: "Created through the organization invitation route",
            employment_type: "full_time",
            weekly_capacity_hours: 40,
            skills: [],
          },
        },
        allowedStatuses: [201],
      }
    );

    assertCondition(
      response.body.data?.membership.status === "invited" &&
        response.body.data.invitation.email === apiEmployeeEmail,
      "Organization admins must create employee invitations through the API."
    );
  });

  await runScenario("organization-admin-can-create-supervisor-invitation", async () => {
    const response = await requestJson<OrganizationInvitationMutationResponse>(
      `/organizations/${ownerAOrganization.organization.id}/invitations`,
      {
        method: "POST",
        token: ownerASession.accessToken,
        organizationId: ownerAOrganization.organization.id,
        body: {
          email: apiSupervisorEmail,
          role: "supervisor",
          profile: {
            full_name: "API Supervisor Invite",
            department: "Operations",
            bio: "Created through the organization invitation route",
          },
        },
        allowedStatuses: [201],
      }
    );

    assertCondition(
      response.body.data?.membership.status === "invited" &&
        response.body.data.invitation.email === apiSupervisorEmail,
      "Organization admins must create supervisor invitations through the API."
    );
  });

  await runScenario("supervisor-cannot-invite", async () => {
    const response = await requestJson<OrganizationInvitationMutationResponse>(
      `/organizations/${ownerAOrganization.organization.id}/invitations`,
      {
        method: "POST",
        token: supervisorASession.accessToken,
        organizationId: ownerAOrganization.organization.id,
        body: {
          email: `invite-denied-${runId}@${TEST_EMAIL_DOMAIN}`,
          role: "employee",
          profile: {
            full_name: "Denied Invite",
          },
        },
        allowedStatuses: [403],
      }
    );

    assertCondition(
      response.body.message === "Forbidden.",
      "Supervisors must not be able to create invitations."
    );
  });

  const inspectionInvitation = await createInvitationWithDebugToken({
    inviterAuthUserId: ownerAAppUser.auth_user_id,
    organizationId: ownerAOrganization.organization.id,
    email: inspectEmployeeEmail,
    role: "employee",
    profile: {
      full_name: "Inspection Employee",
      bio: "Inspection route coverage",
      employment_type: "full_time",
      weekly_capacity_hours: 40,
      skills: [],
    },
  });

  await runScenario("invitation-inspection-returns-safe-fields", async () => {
    const response = await requestJson<InvitationInspectionResponse>(
      `/invitations/${inspectionInvitation.token}`,
      {
        allowedStatuses: [200],
      }
    );

    assertCondition(
      response.body.data?.organization.id === ownerAOrganization.organization.id &&
        response.body.data.role === "employee" &&
        response.body.data.status === "pending" &&
        response.body.data.authentication_required === true,
      "Invitation inspection must expose only safe invitation metadata."
    );
    assertCondition(
      response.body.data !== undefined &&
        !Object.prototype.hasOwnProperty.call(response.body.data, "profile"),
      "Invitation inspection must not expose stored profile JSON."
    );
  });

  await setPasswordForInvitedUser(inspectEmployeeEmail);
  const inspectEmployeeSession = await login(inspectEmployeeEmail);

  await runScenario("wrong-authenticated-email-cannot-accept", async () => {
    const response = await requestJson<InvitationAcceptanceResponse>(
      `/invitations/${inspectionInvitation.token}/accept`,
      {
        method: "POST",
        token: wrongUserSession.accessToken,
        allowedStatuses: [403],
      }
    );

    assertCondition(
      response.body.message === "This invitation does not match the authenticated account.",
      "Invitation acceptance must reject mismatched authenticated emails."
    );
  });

  const expiredInvitation = await createInvitationWithDebugToken({
    inviterAuthUserId: ownerAAppUser.auth_user_id,
    organizationId: ownerAOrganization.organization.id,
    email: expiredEmail,
    role: "employee",
    profile: {
      full_name: "Expired Employee",
      employment_type: "full_time",
      weekly_capacity_hours: 40,
      skills: [],
    },
  });
  await setPasswordForInvitedUser(expiredEmail);
  const expiredSession = await login(expiredEmail);
  await updateInvitationExpiry(
    expiredInvitation.invitation.id,
    "2026-07-16T00:00:00.000Z"
  );

  await runScenario("expired-invitation-cannot-be-accepted", async () => {
    const response = await requestJson<InvitationAcceptanceResponse>(
      `/invitations/${expiredInvitation.token}/accept`,
      {
        method: "POST",
        token: expiredSession.accessToken,
        allowedStatuses: [410],
      }
    );

    assertCondition(
      response.body.message === "This invitation has expired.",
      "Expired invitations must be rejected."
    );
  });

  const revokedInvitation = await createInvitationWithDebugToken({
    inviterAuthUserId: ownerAAppUser.auth_user_id,
    organizationId: ownerAOrganization.organization.id,
    email: revokedEmail,
    role: "employee",
    profile: {
      full_name: "Revoked Employee",
      employment_type: "full_time",
      weekly_capacity_hours: 40,
      skills: [],
    },
  });
  await setPasswordForInvitedUser(revokedEmail);
  const revokedSession = await login(revokedEmail);

  await requestJson<OrganizationInvitationMutationResponse>(
    `/organizations/${ownerAOrganization.organization.id}/invitations/${revokedInvitation.invitation.id}/revoke`,
    {
      method: "POST",
      token: ownerASession.accessToken,
      organizationId: ownerAOrganization.organization.id,
      allowedStatuses: [200],
    }
  );

  await runScenario("revoked-invitation-cannot-be-accepted", async () => {
    const response = await requestJson<InvitationAcceptanceResponse>(
      `/invitations/${revokedInvitation.token}/accept`,
      {
        method: "POST",
        token: revokedSession.accessToken,
        allowedStatuses: [410],
      }
    );

    assertCondition(
      response.body.message === "This invitation is no longer valid.",
      "Revoked invitations must be rejected."
    );
  });

  const acceptedEmployeeInvitation = await createInvitationWithDebugToken({
    inviterAuthUserId: ownerAAppUser.auth_user_id,
    organizationId: ownerAOrganization.organization.id,
    email: acceptedEmployeeEmail,
    role: "employee",
    profile: {
      full_name: "Accepted Employee",
      bio: "Accepted employee profile",
      employment_type: "full_time",
      weekly_capacity_hours: 40,
      skills: [
        {
          name: "React",
          proficiency_level: 4,
          years_of_experience: 3,
        },
      ],
    },
  });

  await setPasswordForInvitedUser(acceptedEmployeeEmail);
  const acceptedEmployeeSession = await login(acceptedEmployeeEmail);
  const acceptedEmployeeAppUser = await findAppUserByEmail(acceptedEmployeeEmail);

  await runScenario("pending-membership-cannot-access-tenant-data-before-acceptance", async () => {
    const response = await requestJson<Record<string, unknown>>("/projects", {
      token: acceptedEmployeeSession.accessToken,
      organizationId: ownerAOrganization.organization.id,
      allowedStatuses: [403],
    });

    assertCondition(
      response.body.message === "Invitation must be accepted before accessing organization data.",
      "Pending memberships must not access organization data."
    );
  });

  await runScenario("employee-acceptance-provisions-profile", async () => {
    const response = await requestJson<InvitationAcceptanceResponse>(
      `/invitations/${acceptedEmployeeInvitation.token}/accept`,
      {
        method: "POST",
        token: acceptedEmployeeSession.accessToken,
        allowedStatuses: [200],
      }
    );

    const { data: employeeProfile, error } = await supabase
      .from("employees")
      .select("id")
      .eq("organization_id", ownerAOrganization.organization.id)
      .eq("user_id", acceptedEmployeeAppUser.id)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error("Unable to verify the provisioned employee profile.");
    }

    assertCondition(
      response.body.data?.membership.status === "active" &&
        response.body.data.profileCreated === true &&
        employeeProfile?.id,
      "Employee acceptance must activate membership and provision the employee profile."
    );
  });

  await runScenario("accepted-membership-can-access-tenant-data-after-acceptance", async () => {
    const response = await requestJson<Record<string, unknown>>("/employees/me", {
      token: acceptedEmployeeSession.accessToken,
      organizationId: ownerAOrganization.organization.id,
      allowedStatuses: [200],
    });

    assertCondition(
      response.body.success,
      "Accepted employee memberships must access organization data after acceptance."
    );
  });

  await runScenario("accepted-invitation-cannot-be-reused", async () => {
    const response = await requestJson<InvitationAcceptanceResponse>(
      `/invitations/${acceptedEmployeeInvitation.token}/accept`,
      {
        method: "POST",
        token: acceptedEmployeeSession.accessToken,
        allowedStatuses: [409],
      }
    );

    assertCondition(
      response.body.message === "This invitation has already been accepted.",
      "Accepted invitations must be single-use."
    );
  });

  const acceptedSupervisorInvitation = await createInvitationWithDebugToken({
    inviterAuthUserId: ownerAAppUser.auth_user_id,
    organizationId: ownerAOrganization.organization.id,
    email: acceptedSupervisorEmail,
    role: "supervisor",
    profile: {
      full_name: "Accepted Supervisor",
      department: "Platform Operations",
      bio: "Accepted supervisor profile",
    },
  });
  await setPasswordForInvitedUser(acceptedSupervisorEmail);
  const acceptedSupervisorSession = await login(acceptedSupervisorEmail);
  const acceptedSupervisorAppUser = await findAppUserByEmail(acceptedSupervisorEmail);

  await runScenario("supervisor-acceptance-provisions-profile", async () => {
    const response = await requestJson<InvitationAcceptanceResponse>(
      `/invitations/${acceptedSupervisorInvitation.token}/accept`,
      {
        method: "POST",
        token: acceptedSupervisorSession.accessToken,
        allowedStatuses: [200],
      }
    );

    const { data: supervisorProfile, error } = await supabase
      .from("supervisors")
      .select("id")
      .eq("organization_id", ownerAOrganization.organization.id)
      .eq("user_id", acceptedSupervisorAppUser.id)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error("Unable to verify the provisioned supervisor profile.");
    }

    assertCondition(
      response.body.data?.membership.status === "active" &&
        response.body.data.profileCreated === true &&
        supervisorProfile?.id,
      "Supervisor acceptance must activate membership and provision the supervisor profile."
    );
  });

  const resendInvitation = await createInvitationWithDebugToken({
    inviterAuthUserId: ownerAAppUser.auth_user_id,
    organizationId: ownerAOrganization.organization.id,
    email: resendEmail,
    role: "employee",
    profile: {
      full_name: "Resend Employee",
      employment_type: "full_time",
      weekly_capacity_hours: 40,
      skills: [],
    },
  });
  const originalInvitationRow = await getInvitationRow(resendInvitation.invitation.id);
  await updateInvitationLastSentAt(
    resendInvitation.invitation.id,
    "2026-07-17T00:00:00.000Z"
  );

  await runScenario("resend-rotates-token-and-invalidates-old-token", async () => {
    const resentInvitation = await resendInvitationWithDebugToken({
      inviterAuthUserId: ownerAAppUser.auth_user_id,
      organizationId: ownerAOrganization.organization.id,
      invitationId: resendInvitation.invitation.id,
    });

    const [oldTokenResponse, newTokenResponse, refreshedInvitationRow] = await Promise.all([
      requestJson<InvitationInspectionResponse>(`/invitations/${resendInvitation.token}`, {
        allowedStatuses: [404],
      }),
      requestJson<InvitationInspectionResponse>(`/invitations/${resentInvitation.token}`, {
        allowedStatuses: [200],
      }),
      getInvitationRow(resendInvitation.invitation.id),
    ]);

    assertCondition(
      oldTokenResponse.body.message === "Invitation not found." &&
        newTokenResponse.body.data?.status === "pending",
      "Resending an invitation must rotate the public token."
    );
    assertCondition(
      refreshedInvitationRow.token_hash !== originalInvitationRow.token_hash,
      "Resending an invitation must rotate the stored token hash."
    );
  });

  const crossOrganizationInvitation = await createInvitationWithDebugToken({
    inviterAuthUserId: ownerBAppUser.auth_user_id,
    organizationId: ownerBOrganization.organization.id,
    email: crossOrgEmail,
    role: "employee",
    profile: {
      full_name: "Cross Org Employee",
      employment_type: "full_time",
      weekly_capacity_hours: 40,
      skills: [],
    },
  });

  await runScenario("cross-organization-invitation-operations-are-denied", async () => {
    const [revokeResponse, resendResponse] = await Promise.all([
      requestJson<OrganizationInvitationMutationResponse>(
        `/organizations/${ownerBOrganization.organization.id}/invitations/${crossOrganizationInvitation.invitation.id}/revoke`,
        {
          method: "POST",
          token: ownerASession.accessToken,
          organizationId: ownerAOrganization.organization.id,
          allowedStatuses: [403],
        }
      ),
      requestJson<OrganizationInvitationMutationResponse>(
        `/organizations/${ownerBOrganization.organization.id}/invitations/${crossOrganizationInvitation.invitation.id}/resend`,
        {
          method: "POST",
          token: ownerASession.accessToken,
          organizationId: ownerAOrganization.organization.id,
          allowedStatuses: [403],
        }
      ),
    ]);

    assertCondition(
      revokeResponse.body.message ===
        "Organization route context must match the selected organization header." &&
        resendResponse.body.message ===
          "Organization route context must match the selected organization header.",
      "Cross-organization invitation operations must be denied."
    );
  });

  await runScenario("raw-token-is-not-stored-in-the-database", async () => {
    const invitationRow = await getInvitationRow(inspectionInvitation.invitation.id);

    assertCondition(
      invitationRow.token_hash !== inspectionInvitation.token &&
        typeof invitationRow.token_hash === "string" &&
        invitationRow.token_hash.length === 64,
      "Invitation storage must keep only the token hash."
    );
  });

  const revokedInvitationRow = await getInvitationRow(revokedInvitation.invitation.id);
  const revokedMembershipRow = await getMembershipRow(revokedInvitation.membership.id);
  const acceptedEmployeeInvitationRow = await getInvitationRow(
    acceptedEmployeeInvitation.invitation.id
  );
  const acceptedEmployeeMembershipRow = await getMembershipRow(
    acceptedEmployeeInvitation.membership.id
  );

  assertCondition(
    revokedInvitationRow.revoked_at !== null &&
      revokedInvitationRow.revoked_by_user_id === ownerAAppUser.id &&
      revokedMembershipRow.status === "suspended",
    "Revocation must persist invitation and membership state."
  );
  assertCondition(
    acceptedEmployeeInvitationRow.accepted_at !== null &&
      acceptedEmployeeInvitationRow.accepted_by_user_id === acceptedEmployeeAppUser.id &&
      acceptedEmployeeMembershipRow.status === "active" &&
      acceptedEmployeeMembershipRow.joined_at !== null,
    "Acceptance must persist invitation and membership activation state."
  );

  return {
    apiBaseUrl: API_BASE_URL,
    organizationIds: {
      organizationA: ownerAOrganization.organization.id,
      organizationB: ownerBOrganization.organization.id,
    },
    verifiedScenarios: 15,
  };
}

async function main() {
  const result = await verifyInvitationLifecycle();
  console.log(
    JSON.stringify(
      {
        scope: "invitation_verification",
        result,
      },
      null,
      2
    )
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}

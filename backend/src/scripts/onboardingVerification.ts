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
    role?: "admin" | "supervisor" | "employee" | null;
    legacyRole?: "admin" | "supervisor" | "employee" | null;
  };
  onboarding: {
    hasActiveOrganization: boolean;
    requiresOrganizationCreation: boolean;
    hasPendingInvitations: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

interface AuthMeResponse {
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
}

interface OrganizationResponse {
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

interface OrganizationsListItem {
  membership: {
    id: string;
    role: "organization_admin" | "supervisor" | "employee";
    status: "active" | "invited" | "suspended";
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  invitation: {
    id: string;
    expires_at: string;
  } | null;
}

type HttpMethod = "GET" | "POST";

interface RequestOptions {
  method?: HttpMethod;
  token?: string;
  organizationId?: string;
  body?: Record<string, unknown>;
  allowedStatuses?: number[];
}

interface AppUserRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  role: string | null;
  platform_role: string | null;
}

const API_BASE_URL =
  process.env.TENANT_ISOLATION_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";
const TEST_PASSWORD = process.env.ONBOARDING_TEST_PASSWORD ?? "OnboardingTest123!";
const TEST_EMAIL_DOMAIN = "example.com";

function logVerificationEvent(event: string, details: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      scope: "onboarding_verification",
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
    .select("id, auth_user_id, email, role, platform_role")
    .eq("email", email)
    .single<AppUserRow>();

  if (error || !data) {
    throw new Error(`Unable to resolve app user for ${email}.`);
  }

  return data;
}

async function login(email: string, password: string) {
  const response = await requestJson<AuthResponse>("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
    allowedStatuses: [200],
  });

  assertCondition(response.body.success, `Login failed for ${email}.`);
  assertCondition(response.body.data?.accessToken, `Missing access token for ${email}.`);
  return response.body.data;
}

async function setPasswordForInvitedUser(email: string, password: string) {
  const appUser = await findAppUserByEmail(email);
  const { data, error } = await supabase.auth.admin.updateUserById(appUser.auth_user_id, {
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Unable to set password for invited user ${email}.`);
  }
}

export async function verifyOnboardingFlow() {
  const runId = crypto.randomUUID().slice(0, 8);
  const ownerEmail = `tenant-owner-${runId}@${TEST_EMAIL_DOMAIN}`;
  const employeeEmail = `tenant-employee-${runId}@${TEST_EMAIL_DOMAIN}`;
  const supervisorEmail = `tenant-supervisor-${runId}@${TEST_EMAIL_DOMAIN}`;
  const organizationSlug = `tenant-onboarding-${runId}`;
  const organizationName = `Tenant Onboarding ${runId}`;

  const registerResponse = await requestJson<AuthResponse>("/auth/register", {
    method: "POST",
    body: {
      email: ownerEmail,
      password: TEST_PASSWORD,
    },
    allowedStatuses: [201],
  });

  assertCondition(registerResponse.body.data, "Registration response is missing data.");
  const ownerSession = registerResponse.body.data;
  const ownerToken = ownerSession.accessToken;

  await runScenario("public-registration-identity-only", async () => {
    assertCondition(
      ownerSession.user.platformRole === null,
      "Normal customer registration must not assign a platform role."
    );
    assertCondition(
      ownerSession.onboarding.hasActiveOrganization === false &&
        ownerSession.onboarding.requiresOrganizationCreation === true &&
        ownerSession.onboarding.hasPendingInvitations === false,
      "Fresh registration must require organization creation."
    );

    const appUser = await findAppUserByEmail(ownerEmail);
    const { data: employeeProfile } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", appUser.id)
      .maybeSingle<{ id: string }>();
    const { data: supervisorProfile } = await supabase
      .from("supervisors")
      .select("id")
      .eq("user_id", appUser.id)
      .maybeSingle<{ id: string }>();
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", appUser.id)
      .returns<Array<{ id: string }>>();

    assertCondition(
      appUser.role !== "employee" && appUser.role !== "supervisor",
      "Registration must not assign employee or supervisor legacy roles."
    );
    assertCondition(
      appUser.platform_role === null,
      "Registration must not assign a platform role in the database."
    );
    assertCondition(employeeProfile === null, "Registration must not create an employee profile.");
    assertCondition(
      supervisorProfile === null,
      "Registration must not create a supervisor profile."
    );
    assertCondition(
      (memberships ?? []).length === 0,
      "Registration must not create organization memberships."
    );
  });

  await runScenario("registration-rejects-role-selection", async () => {
    const invalidRegisterResponse = await requestJson<AuthResponse>("/auth/register", {
      method: "POST",
      body: {
        email: `invalid-register-${runId}@${TEST_EMAIL_DOMAIN}`,
        password: TEST_PASSWORD,
        role: "employee",
      },
      allowedStatuses: [400],
    });

    assertCondition(
      invalidRegisterResponse.body.message ===
        "role cannot be assigned during account registration.",
      "Registration must reject tenant-role assignment attempts."
    );
  });

  const organizationResponse = await requestJson<OrganizationResponse>("/organizations", {
    method: "POST",
    token: ownerToken,
    body: {
      name: organizationName,
      slug: organizationSlug,
    },
    allowedStatuses: [201],
  });

  assertCondition(organizationResponse.body.data, "Organization creation is missing data.");
  const createdOrganization = organizationResponse.body.data;

  await runScenario("organization-bootstrap", async () => {
    assertCondition(
      createdOrganization.membership.role === "organization_admin" &&
        createdOrganization.membership.status === "active" &&
        typeof createdOrganization.membership.joined_at === "string",
      "Organization creator must become an active organization_admin."
    );

    const authMeResponse = await requestJson<AuthMeResponse>("/auth/me", {
      token: ownerToken,
      allowedStatuses: [200],
    });

    assertCondition(
      authMeResponse.body.data?.onboarding.hasActiveOrganization === true &&
        authMeResponse.body.data.onboarding.requiresOrganizationCreation === false,
      "Organization bootstrap must clear the organization-creation onboarding state."
    );
  });

  await runScenario("single-organization-mvp-rule", async () => {
    const secondOrganizationResponse = await requestJson<OrganizationResponse>(
      "/organizations",
      {
        method: "POST",
        token: ownerToken,
        body: {
          name: `${organizationName} 2`,
          slug: `${organizationSlug}-2`,
        },
        allowedStatuses: [409],
      }
    );

    assertCondition(
      secondOrganizationResponse.body.message ===
        "Only users without an active organization can create their first organization.",
      "Users with an active organization must not create another organization in the MVP flow."
    );
  });

  const employeeInviteResponse = await requestJson<{
    membership: { status: string };
    invitation: { id: string };
  }>(`/organizations/${createdOrganization.organization.id}/invitations`, {
    method: "POST",
    token: ownerToken,
    organizationId: createdOrganization.organization.id,
    body: {
      email: employeeEmail,
      role: "employee",
      profile: {
        full_name: "Invited Employee",
        bio: "Invited employee profile",
        employment_type: "full_time",
        weekly_capacity_hours: 40,
        skills: [],
      },
    },
    allowedStatuses: [201],
  });
  const supervisorInviteResponse = await requestJson<{
    membership: { status: string };
    invitation: { id: string };
  }>(`/organizations/${createdOrganization.organization.id}/invitations`, {
    method: "POST",
    token: ownerToken,
    organizationId: createdOrganization.organization.id,
    body: {
      email: supervisorEmail,
      role: "supervisor",
      profile: {
        full_name: "Invited Supervisor",
        department: "Engineering",
        bio: "Invited supervisor profile",
      },
    },
    allowedStatuses: [201],
  });

  await runScenario("invitation-created-memberships-only", async () => {
    assertCondition(
      employeeInviteResponse.body.data?.membership.status === "invited" &&
        supervisorInviteResponse.body.data?.membership.status === "invited",
      "Employee and supervisor memberships must start as invited."
    );
  });

  await setPasswordForInvitedUser(employeeEmail, TEST_PASSWORD);
  await setPasswordForInvitedUser(supervisorEmail, TEST_PASSWORD);

  const employeeSession = await login(employeeEmail, TEST_PASSWORD);
  const supervisorSession = await login(supervisorEmail, TEST_PASSWORD);

  await runScenario("invited-members-blocked-before-acceptance", async () => {
    const [employeeOrganizations, supervisorOrganizations, employeeProjects] =
      await Promise.all([
        requestJson<OrganizationsListItem[]>("/organizations", {
          token: employeeSession.accessToken,
          allowedStatuses: [200],
        }),
        requestJson<OrganizationsListItem[]>("/organizations", {
          token: supervisorSession.accessToken,
          allowedStatuses: [200],
        }),
        requestJson<Record<string, unknown>[]>("/projects", {
          token: employeeSession.accessToken,
          organizationId: createdOrganization.organization.id,
          allowedStatuses: [403],
        }),
      ]);

    assertCondition(
      employeeOrganizations.body.data?.some(
        (item) => item.membership.status === "invited" && item.invitation !== null
      ),
      "Invited employees must see invited organization state."
    );
    assertCondition(
      supervisorOrganizations.body.data?.some(
        (item) => item.membership.status === "invited" && item.invitation !== null
      ),
      "Invited supervisors must see invited organization state."
    );
    assertCondition(
      employeeProjects.body.message ===
        "Invitation must be accepted before accessing organization data.",
      "Invited members must not access tenant data before acceptance."
    );
  });

  await runScenario("employee-acceptance", async () => {
    const acceptanceResponse = await requestJson<OrganizationResponse>(
      "/organizations/invitations/accept",
      {
        method: "POST",
        token: employeeSession.accessToken,
        organizationId: createdOrganization.organization.id,
        allowedStatuses: [200],
      }
    );

    assertCondition(
      acceptanceResponse.body.data?.membership.role === "employee" &&
        acceptanceResponse.body.data.membership.status === "active",
      "Invited employee must become active only after acceptance."
    );
  });

  await runScenario("supervisor-acceptance", async () => {
    const acceptanceResponse = await requestJson<OrganizationResponse>(
      "/organizations/invitations/accept",
      {
        method: "POST",
        token: supervisorSession.accessToken,
        organizationId: createdOrganization.organization.id,
        allowedStatuses: [200],
      }
    );

    assertCondition(
      acceptanceResponse.body.data?.membership.role === "supervisor" &&
        acceptanceResponse.body.data.membership.status === "active",
      "Invited supervisor must become active only after acceptance."
    );
  });

  await runScenario("legacy-signup-deprecated", async () => {
    const legacySignupResponse = await requestJson<AuthResponse>("/auth/signup", {
      method: "POST",
      body: {
        email: `legacy-signup-${runId}@${TEST_EMAIL_DOMAIN}`,
        password: TEST_PASSWORD,
        full_name: "Legacy Signup",
        employment_type: "full_time",
        weekly_capacity_hours: 40,
        skills: [],
      },
      allowedStatuses: [410],
    });

    assertCondition(
      legacySignupResponse.body.message ===
        "Legacy employee signup has been deprecated. Register an account, create an organization, or accept an invitation.",
      "Legacy employee signup must be disabled when the feature flag is off."
    );
  });

  return {
    apiBaseUrl: API_BASE_URL,
    organizationId: createdOrganization.organization.id,
    verifiedScenarios: 8,
  };
}

async function main() {
  const result = await verifyOnboardingFlow();
  console.log(
    JSON.stringify(
      {
        scope: "onboarding_verification",
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

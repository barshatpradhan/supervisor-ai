import { fileURLToPath } from "node:url";
import {
  getTenantIsolationCredentials,
  seedTenantIsolationDataset,
} from "./tenantIsolationDataset.js";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface LoginResponse {
  accessToken: string;
}

interface CurrentUserOrganizationListItem {
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

interface OrganizationMemberSummary {
  email: string | null;
}

interface ProjectSummary {
  id: string;
  title: string;
}

interface TaskSummary {
  id: string;
  title: string;
}

interface RecommendationResult {
  employeeName: string;
}

interface RecommendationResponse {
  recommendations: RecommendationResult[];
}

interface EmployeeDashboardResponse {
  currentAssignments: Array<{
    task_id: string;
    title: string;
    project_id: string;
    project_title: string;
  }>;
  recentProgress: Array<{
    task_title: string;
    project_title: string;
  }>;
}

interface SupervisorDashboardResponse {
  projects: {
    recently_updated_projects: Array<{
      id: string;
      title: string;
    }>;
  };
  tasks: {
    recent_tasks: Array<{
      id: string;
      title: string;
      project_id: string;
      project_title: string;
    }>;
  };
  recommendations: {
    recent_recommendation_runs: Array<{
      project_id: string;
      project_title: string;
      top_candidate: {
        employee_name: string;
      };
    }>;
  };
}

interface ProjectDocumentWithAnalysis {
  document: {
    id: string;
    original_filename: string;
    project_id: string;
  };
  analysis: {
    id: string;
    summary: string;
  } | null;
}

type HttpMethod = "GET" | "POST" | "PATCH";

interface RequestOptions {
  method?: HttpMethod;
  token?: string;
  organizationId?: string;
  body?: Record<string, unknown>;
  allowedStatuses?: number[];
}

const API_BASE_URL =
  process.env.TENANT_ISOLATION_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";

function logVerificationEvent(event: string, details: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      scope: "tenant_isolation_verification",
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

async function login(email: string, password: string) {
  const response = await requestJson<LoginResponse>("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
    allowedStatuses: [200],
  });

  assertCondition(response.body.success, `Login failed for ${email}.`);
  assertCondition(response.body.data?.accessToken, `Missing access token for ${email}.`);

  return response.body.data.accessToken;
}

async function runScenario(
  id: string,
  execute: () => Promise<void>
) {
  logVerificationEvent("scenario_start", { id });

  await execute();

  logVerificationEvent("scenario_pass", { id });
}

export async function verifyTenantIsolation() {
  const dataset = await seedTenantIsolationDataset();
  const credentials = getTenantIsolationCredentials();
  const password = credentials.password;
  const usersByKey = Object.fromEntries(
    credentials.users.map((user) => [user.key, user])
  );

  const orgA = dataset.organizations.organizationA;
  const orgB = dataset.organizations.organizationB;
  const {
    projectAId,
    projectBId,
    taskAId,
    taskBId,
    taskCrossBId,
    documentAId,
    documentBId,
    dualRoleEmployeeBProfileId,
  } = dataset.resources;

  const organizationAdminAToken = await login(
    usersByKey.organizationAdminA.email,
    password
  );
  const supervisorAToken = await login(usersByKey.supervisorA.email, password);
  const employeeAToken = await login(usersByKey.employeeA.email, password);
  const organizationAdminBToken = await login(
    usersByKey.organizationAdminB.email,
    password
  );
  const dualRoleToken = await login(usersByKey.dualRoleUser.email, password);
  const invitedToken = await login(usersByKey.invitedUser.email, password);
  const suspendedToken = await login(usersByKey.suspendedUser.email, password);

  await runScenario("organizations-list", async () => {
    const [adminAResponse, dualRoleResponse, invitedResponse, suspendedResponse] =
      await Promise.all([
        requestJson<CurrentUserOrganizationListItem[]>("/organizations", {
          token: organizationAdminAToken,
          allowedStatuses: [200],
        }),
        requestJson<CurrentUserOrganizationListItem[]>("/organizations", {
          token: dualRoleToken,
          allowedStatuses: [200],
        }),
        requestJson<CurrentUserOrganizationListItem[]>("/organizations", {
          token: invitedToken,
          allowedStatuses: [200],
        }),
        requestJson<CurrentUserOrganizationListItem[]>("/organizations", {
          token: suspendedToken,
          allowedStatuses: [200],
        }),
      ]);

    assertCondition(
      adminAResponse.body.data?.some(
        (item) =>
          item.organization.id === orgA.id && item.membership.status === "active"
      ),
      "Organization admin A should have one active membership in organization A."
    );
    assertCondition(
      dualRoleResponse.body.data?.length === 2,
      "Dual-role user should see two memberships."
    );
    assertCondition(
      dualRoleResponse.body.data?.some(
        (item) =>
          item.organization.id === orgA.id &&
          item.membership.role === "supervisor" &&
          item.membership.status === "active"
      ),
      "Dual-role user should be supervisor in organization A."
    );
    assertCondition(
      dualRoleResponse.body.data?.some(
        (item) =>
          item.organization.id === orgB.id &&
          item.membership.role === "employee" &&
          item.membership.status === "active"
      ),
      "Dual-role user should be employee in organization B."
    );
    assertCondition(
      invitedResponse.body.data?.some(
        (item) =>
          item.organization.id === orgA.id &&
          item.membership.status === "invited" &&
          item.invitation !== null
      ),
      "Invited user should receive invited membership metadata."
    );
    assertCondition(
      suspendedResponse.body.data?.some(
        (item) =>
          item.organization.id === orgB.id && item.membership.status === "suspended"
      ),
      "Suspended user should receive suspended membership metadata."
    );
  });

  await runScenario("organization-members-and-invitations", async () => {
    const detailsResponse = await requestJson<{ id: string; name: string }>(
      `/organizations/${orgA.id}`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      }
    );
    const membersResponse = await requestJson<OrganizationMemberSummary[]>(
      `/organizations/${orgA.id}/members`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      }
    );
    const invitationsResponse = await requestJson<
      Array<{
        email: string;
        membership_status: string;
      }>
    >(`/organizations/${orgA.id}/invitations`, {
      token: organizationAdminAToken,
      organizationId: orgA.id,
      allowedStatuses: [200],
    });

    assertCondition(
      detailsResponse.body.data?.id === orgA.id,
      "Organization details should resolve inside organization A."
    );
    assertCondition(
      membersResponse.body.data?.some(
        (member) => member.email === usersByKey.employeeA.email
      ),
      "Organization A members should include employee A."
    );
    assertCondition(
      invitationsResponse.body.data?.some(
        (invitation) =>
          invitation.email === usersByKey.invitedUser.email &&
          invitation.membership_status === "invited"
      ),
      "Organization A invitations should include the invited user."
    );
  });

  await runScenario("organization-header-validation", async () => {
    const missingHeaderResponse = await requestJson<ProjectSummary[]>("/projects", {
      token: organizationAdminAToken,
      allowedStatuses: [400],
    });
    const invalidHeaderResponse = await requestJson<ProjectSummary[]>("/projects", {
      token: organizationAdminAToken,
      organizationId: "not-a-uuid",
      allowedStatuses: [400],
    });

    assertCondition(
      missingHeaderResponse.body.message === "X-Organization-Id header is required.",
      "Missing organization header should return a safe 400."
    );
    assertCondition(
      invalidHeaderResponse.body.message === "X-Organization-Id must be a valid UUID.",
      "Invalid organization header should return a safe 400."
    );
  });

  await runScenario("organization-membership-denials", async () => {
    const crossOrganizationResponse = await requestJson<ProjectSummary[]>("/projects", {
      token: organizationAdminAToken,
      organizationId: orgB.id,
      allowedStatuses: [403],
    });
    const invitedResponse = await requestJson<ProjectSummary[]>("/projects", {
      token: invitedToken,
      organizationId: orgA.id,
      allowedStatuses: [403],
    });
    const suspendedResponse = await requestJson<ProjectSummary[]>("/projects", {
      token: suspendedToken,
      organizationId: orgB.id,
      allowedStatuses: [403],
    });

    assertCondition(
      crossOrganizationResponse.body.message === "Organization membership not found.",
      "Cross-organization project access should be rejected."
    );
    assertCondition(
      invitedResponse.body.message ===
        "Invitation must be accepted before accessing organization data.",
      "Invited memberships must be blocked from tenant data."
    );
    assertCondition(
      suspendedResponse.body.message === "Organization membership is suspended.",
      "Suspended memberships must be blocked from tenant data."
    );
  });

  await runScenario("organization-role-restrictions", async () => {
    const supervisorInviteResponse = await requestJson<Record<string, unknown>>(
      `/organizations/${orgA.id}/invitations`,
      {
        method: "POST",
        token: supervisorAToken,
        organizationId: orgA.id,
        body: {
          email: "tenant-denied-invite@example.test",
          role: "employee",
          profile: {
            full_name: "Denied Invite",
          },
        },
        allowedStatuses: [403],
      }
    );
    const crossOrganizationInviteResponse = await requestJson<Record<string, unknown>>(
      `/organizations/${orgB.id}/invitations`,
      {
        method: "POST",
        token: organizationAdminAToken,
        organizationId: orgA.id,
        body: {
          email: "tenant-cross-org-invite@example.test",
          role: "employee",
          profile: {
            full_name: "Cross Org Invite",
          },
        },
        allowedStatuses: [403],
      }
    );

    assertCondition(
      supervisorInviteResponse.body.message === "Forbidden.",
      "Supervisors must not be able to invite organization members."
    );
    assertCondition(
      crossOrganizationInviteResponse.body.message ===
        "Organization route context must match the selected organization header.",
      "Organization admins must not invite into a different organization context."
    );
  });

  await runScenario("project-isolation", async () => {
    const projectListResponse = await requestJson<ProjectSummary[]>("/projects", {
      token: organizationAdminAToken,
      organizationId: orgA.id,
      allowedStatuses: [200],
    });
    const projectDetailResponse = await requestJson<ProjectSummary>(
      `/projects/${projectAId}`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      }
    );
    const crossProjectDetailResponse = await requestJson<ProjectSummary>(
      `/projects/${projectBId}`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [404],
      }
    );

    assertCondition(
      projectListResponse.body.data?.some((project) => project.id === projectAId) &&
        !projectListResponse.body.data?.some((project) => project.id === projectBId),
      "Organization A project list must exclude organization B projects."
    );
    assertCondition(
      projectDetailResponse.body.data?.id === projectAId,
      "Organization A project detail should resolve project A."
    );
    assertCondition(
      crossProjectDetailResponse.body.message === "Project not found.",
      "Cross-organization project detail must not leak existence."
    );
  });

  await runScenario("task-isolation", async () => {
    const adminTaskListResponse = await requestJson<TaskSummary[]>("/tasks", {
      token: organizationAdminAToken,
      organizationId: orgA.id,
      allowedStatuses: [200],
    });
    const employeeTaskListResponse = await requestJson<TaskSummary[]>("/tasks", {
      token: employeeAToken,
      organizationId: orgA.id,
      allowedStatuses: [200],
    });
    const taskDetailResponse = await requestJson<TaskSummary>(`/tasks/${taskAId}`, {
      token: employeeAToken,
      organizationId: orgA.id,
      allowedStatuses: [200],
    });
    const crossTaskResponse = await requestJson<TaskSummary>(`/tasks/${taskBId}`, {
      token: organizationAdminAToken,
      organizationId: orgA.id,
      allowedStatuses: [404],
    });

    assertCondition(
      adminTaskListResponse.body.data?.some((task) => task.id === taskAId) &&
        !adminTaskListResponse.body.data?.some((task) => task.id === taskBId),
      "Organization A task list must exclude organization B tasks."
    );
    assertCondition(
      employeeTaskListResponse.body.data?.length === 1 &&
        employeeTaskListResponse.body.data[0]?.id === taskAId,
      "Employee A should only see assigned organization A tasks."
    );
    assertCondition(
      taskDetailResponse.body.data?.id === taskAId,
      "Employee A should access their assigned task."
    );
    assertCondition(
      crossTaskResponse.body.message === "Task not found.",
      "Cross-organization task detail must not leak existence."
    );
  });

  await runScenario("task-assignment-and-progress-denials", async () => {
    const crossAssignmentResponse = await requestJson<Record<string, unknown>>(
      `/tasks/${taskAId}/assign`,
      {
        method: "PATCH",
        token: organizationAdminAToken,
        organizationId: orgA.id,
        body: {
          employeeId: dualRoleEmployeeBProfileId,
        },
        allowedStatuses: [404],
      }
    );
    const crossProgressResponse = await requestJson<Record<string, unknown>>(
      `/tasks/${taskCrossBId}/progress`,
      {
        method: "POST",
        token: employeeAToken,
        organizationId: orgA.id,
        body: {
          progressPercentage: 40,
          status: "in_progress",
          notes: "Cross organization progress attempt",
        },
        allowedStatuses: [404],
      }
    );

    assertCondition(
      crossAssignmentResponse.body.message === "Assigned employee was not found.",
      "Cross-organization assignment should reject foreign employee ids."
    );
    assertCondition(
      crossProgressResponse.body.message === "Task not found.",
      "Employees must not update progress for another organization's task."
    );
  });

  await runScenario("document-and-analysis-isolation", async () => {
    const documentListResponse = await requestJson<ProjectDocumentWithAnalysis[]>(
      `/projects/${projectAId}/documents`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      }
    );
    const documentDetailResponse = await requestJson<ProjectDocumentWithAnalysis>(
      `/projects/${projectAId}/documents/${documentAId}`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      }
    );
    const crossProjectDocumentListResponse = await requestJson<ProjectDocumentWithAnalysis[]>(
      `/projects/${projectBId}/documents`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [404],
      }
    );
    const crossDocumentDetailResponse = await requestJson<ProjectDocumentWithAnalysis>(
      `/projects/${projectAId}/documents/${documentBId}`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [404],
      }
    );

    assertCondition(
      documentListResponse.body.data?.some(
        (entry) =>
          entry.document.id === documentAId &&
          entry.analysis !== null &&
          entry.analysis.summary.length > 0
      ),
      "Organization A documents should include the seeded analysis for document A."
    );
    assertCondition(
      documentDetailResponse.body.data?.document.id === documentAId &&
        (documentDetailResponse.body.data.analysis?.summary.length ?? 0) > 0,
      "Document detail should only expose analysis inside project A."
    );
    assertCondition(
      crossProjectDocumentListResponse.body.message === "Project not found.",
      "Cross-organization project documents list must not leak project B."
    );
    assertCondition(
      crossDocumentDetailResponse.body.message === "Project document not found.",
      "Cross-organization document detail must not leak document B."
    );
  });

  await runScenario("recommendation-isolation", async () => {
    const generatedRecommendationsResponse = await requestJson<RecommendationResponse>(
      `/projects/${projectAId}/recommendations`,
      {
        method: "POST",
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [201],
      }
    );
    const latestRecommendationsResponse = await requestJson<RecommendationResponse>(
      `/projects/${projectBId}/recommendations`,
      {
        token: organizationAdminBToken,
        organizationId: orgB.id,
        allowedStatuses: [200],
      }
    );
    const crossRecommendationResponse = await requestJson<RecommendationResponse>(
      `/projects/${projectBId}/recommendations`,
      {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [404],
      }
    );

    const generatedNames =
      generatedRecommendationsResponse.body.data?.recommendations.map(
        (recommendation) => recommendation.employeeName
      ) ?? [];
    const latestOrgBNames =
      latestRecommendationsResponse.body.data?.recommendations.map(
        (recommendation) => recommendation.employeeName
      ) ?? [];

    assertCondition(
      generatedNames.length > 0 &&
        generatedNames.every((name) => name !== "Employee B" && name !== "Dual Role User"),
      "Organization A recommendations must not include organization B employees."
    );
    assertCondition(
      latestOrgBNames.some((name) => name === "Employee B") &&
        latestOrgBNames.some((name) => name === "Dual Role User") &&
        !latestOrgBNames.some((name) => name === "Employee A"),
      "Organization B recommendations must stay inside organization B."
    );
    assertCondition(
      crossRecommendationResponse.body.message === "Project not found.",
      "Cross-organization recommendation access must not leak project B."
    );
  });

  await runScenario("dashboard-isolation", async () => {
    const supervisorDashboardResponse =
      await requestJson<SupervisorDashboardResponse>("/dashboard/supervisor", {
        token: organizationAdminAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      });
    const employeeDashboardResponse =
      await requestJson<EmployeeDashboardResponse>("/dashboard/employee", {
        token: employeeAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      });

    assertCondition(
      supervisorDashboardResponse.body.data?.projects.recently_updated_projects.every(
        (project) => project.id === projectAId
      ) &&
        supervisorDashboardResponse.body.data?.tasks.recent_tasks.every(
          (task) => task.project_id === projectAId && task.id !== taskBId
        ) &&
        supervisorDashboardResponse.body.data?.recommendations.recent_recommendation_runs.every(
          (run) => run.project_id === projectAId && run.top_candidate.employee_name === "Employee A"
        ),
      "Supervisor dashboard for organization A must exclude organization B records."
    );
    assertCondition(
      employeeDashboardResponse.body.data?.currentAssignments.every(
        (assignment) =>
          assignment.task_id === taskAId &&
          assignment.project_id === projectAId &&
          assignment.title !== TASK_B_LABEL
      ) &&
        employeeDashboardResponse.body.data?.recentProgress.every(
          (progress) => progress.project_title === "Tenant Isolation Project A"
        ),
      "Employee dashboard for organization A must exclude organization B records."
    );
  });

  await runScenario("profile-isolation", async () => {
    const employeeProfileResponse = await requestJson<{ full_name: string }>(
      "/employees/me",
      {
        token: employeeAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      }
    );
    const supervisorProfileResponse = await requestJson<{ full_name: string }>(
      "/supervisors/me",
      {
        token: supervisorAToken,
        organizationId: orgA.id,
        allowedStatuses: [200],
      }
    );
    const employeeCrossOrganizationResponse = await requestJson<{ full_name: string }>(
      "/employees/me",
      {
        token: employeeAToken,
        organizationId: orgB.id,
        allowedStatuses: [403],
      }
    );

    assertCondition(
      employeeProfileResponse.body.data?.full_name === "Employee A",
      "Employee profile should resolve inside organization A."
    );
    assertCondition(
      supervisorProfileResponse.body.data?.full_name === "Supervisor A",
      "Supervisor profile should resolve inside organization A."
    );
    assertCondition(
      employeeCrossOrganizationResponse.body.message === "Organization membership not found.",
      "Employee profile must be inaccessible across organizations."
    );
  });

  return {
    apiBaseUrl: API_BASE_URL,
    organizationIds: {
      organizationA: orgA.id,
      organizationB: orgB.id,
    },
    verifiedScenarios: 12,
  };
}

const TASK_B_LABEL = "Tenant Isolation Task B";

async function main() {
  const result = await verifyTenantIsolation();
  console.log(
    JSON.stringify(
      {
        scope: "tenant_isolation_verification",
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

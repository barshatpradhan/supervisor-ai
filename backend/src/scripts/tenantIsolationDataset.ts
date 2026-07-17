import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { supabase } from "../config/supabase.js";

type LegacyUserRole = "admin" | "supervisor" | "employee";
type MembershipRole = "organization_admin" | "supervisor" | "employee";
type MembershipStatus = "active" | "invited" | "suspended";

interface TestUserDefinition {
  email: string;
  key: string;
  legacyRole: LegacyUserRole;
}

interface SeededUser {
  id: string;
  auth_user_id: string;
  email: string;
  role: LegacyUserRole;
}

interface SeededOrganization {
  id: string;
  name: string;
  slug: string;
}

interface SeededMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
}

interface DatasetContext {
  organizations: {
    organizationA: SeededOrganization;
    organizationB: SeededOrganization;
  };
  users: Record<string, SeededUser>;
  memberships: Record<string, SeededMembership>;
  resources: {
    projectAId: string;
    projectBId: string;
    taskAId: string;
    taskBId: string;
    taskCrossBId: string;
    documentAId: string;
    documentBId: string;
    employeeAProfileId: string;
    employeeBProfileId: string;
    dualRoleEmployeeBProfileId: string;
  };
}

const TEST_PASSWORD = process.env.TENANT_ISOLATION_TEST_PASSWORD ?? "TenantTest123!";
const PROJECT_A_TITLE = "Tenant Isolation Project A";
const PROJECT_B_TITLE = "Tenant Isolation Project B";
const TASK_A_TITLE = "Tenant Isolation Task A";
const TASK_B_TITLE = "Tenant Isolation Task B";
const TASK_B_CROSS_TITLE = "Tenant Isolation Task B Cross";
const DOCUMENT_A_FILENAME = "tenant-isolation-org-a.txt";
const DOCUMENT_B_FILENAME = "tenant-isolation-org-b.txt";

const TEST_USERS: TestUserDefinition[] = [
  {
    key: "organizationAdminA",
    email: "tenant-org-admin-a@example.test",
    legacyRole: "admin",
  },
  {
    key: "supervisorA",
    email: "tenant-supervisor-a@example.test",
    legacyRole: "supervisor",
  },
  {
    key: "employeeA",
    email: "tenant-employee-a@example.test",
    legacyRole: "employee",
  },
  {
    key: "organizationAdminB",
    email: "tenant-org-admin-b@example.test",
    legacyRole: "admin",
  },
  {
    key: "supervisorB",
    email: "tenant-supervisor-b@example.test",
    legacyRole: "supervisor",
  },
  {
    key: "employeeB",
    email: "tenant-employee-b@example.test",
    legacyRole: "employee",
  },
  {
    key: "dualRoleUser",
    email: "tenant-dual-role@example.test",
    legacyRole: "supervisor",
  },
  {
    key: "invitedUser",
    email: "tenant-invited@example.test",
    legacyRole: "employee",
  },
  {
    key: "suspendedUser",
    email: "tenant-suspended@example.test",
    legacyRole: "employee",
  },
];

function logSeedEvent(event: string, details: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      scope: "tenant_isolation_seed",
      event,
      ...details,
    })
  );
}

async function createOrUpdateAuthUser(email: string) {
  const { data: existingAppUser } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role")
    .eq("email", email)
    .maybeSingle<SeededUser>();

  if (existingAppUser?.auth_user_id) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existingAppUser.auth_user_id,
      {
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      }
    );

    if (!error && data.user) {
      return data.user.id;
    }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Unable to create auth user for ${email}.`);
  }

  return data.user.id;
}

async function ensureAppUser(definition: TestUserDefinition): Promise<SeededUser> {
  const authUserId = await createOrUpdateAuthUser(definition.email);
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, auth_user_id, email, role")
    .eq("email", definition.email)
    .maybeSingle<SeededUser>();

  if (existingUser) {
    if (
      existingUser.auth_user_id === authUserId &&
      existingUser.email === definition.email &&
      existingUser.role === definition.legacyRole
    ) {
      return existingUser;
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        auth_user_id: authUserId,
        email: definition.email,
        role: definition.legacyRole,
      })
      .eq("id", existingUser.id)
      .select("id, auth_user_id, email, role")
      .single<SeededUser>();

    if (error || !updatedUser) {
      throw new Error(`Unable to update app user for ${definition.email}.`);
    }

    return updatedUser;
  }

  const { data: createdUser, error } = await supabase
    .from("users")
    .insert({
      auth_user_id: authUserId,
      email: definition.email,
      role: definition.legacyRole,
    })
    .select("id, auth_user_id, email, role")
    .single<SeededUser>();

  if (error || !createdUser) {
    throw new Error(`Unable to create app user for ${definition.email}.`);
  }

  return createdUser;
}

async function ensureOrganization(
  slug: string,
  name: string,
  createdByUserId: string
): Promise<SeededOrganization> {
  const { data: existingOrganization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle<SeededOrganization>();

  if (existingOrganization) {
    const { data: updatedOrganization, error } = await supabase
      .from("organizations")
      .update({
        name,
        created_by_user_id: createdByUserId,
      })
      .eq("id", existingOrganization.id)
      .select("id, name, slug")
      .single<SeededOrganization>();

    if (error || !updatedOrganization) {
      throw new Error(`Unable to update organization ${slug}.`);
    }

    return updatedOrganization;
  }

  const { data: createdOrganization, error } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      created_by_user_id: createdByUserId,
    })
    .select("id, name, slug")
    .single<SeededOrganization>();

  if (error || !createdOrganization) {
    throw new Error(`Unable to create organization ${slug}.`);
  }

  return createdOrganization;
}

async function ensureMembership(input: {
  organizationId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  invitedByUserId: string;
}) {
  const invitedAt = new Date().toISOString();
  const joinedAt = input.status === "active" ? invitedAt : null;

  const { data: existingMembership } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role, status")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .maybeSingle<SeededMembership>();

  if (existingMembership) {
    const { data: updatedMembership, error } = await supabase
      .from("organization_members")
      .update({
        role: input.role,
        status: input.status,
        invited_by_user_id: input.invitedByUserId,
        invited_at: invitedAt,
        joined_at: joinedAt,
      })
      .eq("id", existingMembership.id)
      .select("id, organization_id, user_id, role, status")
      .single<SeededMembership>();

    if (error || !updatedMembership) {
      throw new Error("Unable to update organization membership.");
    }

    return updatedMembership;
  }

  const { data: createdMembership, error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      role: input.role,
      status: input.status,
      invited_by_user_id: input.invitedByUserId,
      invited_at: invitedAt,
      joined_at: joinedAt,
    })
    .select("id, organization_id, user_id, role, status")
    .single<SeededMembership>();

  if (error || !createdMembership) {
    throw new Error("Unable to create organization membership.");
  }

  return createdMembership;
}

async function ensureInvitation(input: {
  organizationId: string;
  membershipId: string;
  invitedByUserId: string;
  role: Exclude<MembershipRole, "organization_admin">;
  user: SeededUser;
  profile: Record<string, unknown>;
}) {
  await supabase
    .from("organization_invitations")
    .delete()
    .eq("membership_id", input.membershipId)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const { error } = await supabase.from("organization_invitations").insert({
    organization_id: input.organizationId,
    user_id: input.user.id,
    membership_id: input.membershipId,
    email: input.user.email,
    role: input.role,
    profile: input.profile,
    invited_by_user_id: input.invitedByUserId,
    invited_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error("Unable to create tenant isolation invitation.");
  }
}

async function ensureEmployeeProfile(input: {
  organizationId: string;
  userId: string;
  fullName: string;
  bio: string;
  employmentType: "full_time" | "part_time";
  weeklyCapacityHours: number;
}) {
  const { data: existingProfile } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .maybeSingle<{ id: string }>();

  if (existingProfile) {
    const { data: updatedProfile, error } = await supabase
      .from("employees")
      .update({
        full_name: input.fullName,
        bio: input.bio,
        employment_type: input.employmentType,
        weekly_capacity_hours: input.weeklyCapacityHours,
      })
      .eq("id", existingProfile.id)
      .select("id")
      .single<{ id: string }>();

    if (error || !updatedProfile) {
      throw new Error("Unable to update employee profile.");
    }

    return updatedProfile.id;
  }

  const { data: createdProfile, error } = await supabase
    .from("employees")
    .insert({
      user_id: input.userId,
      organization_id: input.organizationId,
      full_name: input.fullName,
      bio: input.bio,
      employment_type: input.employmentType,
      weekly_capacity_hours: input.weeklyCapacityHours,
      workload_percentage: 0,
      availability_percentage: 100,
      performance_score: 82,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !createdProfile) {
    throw new Error("Unable to create employee profile.");
  }

  return createdProfile.id;
}

async function ensureSupervisorProfile(input: {
  organizationId: string;
  userId: string;
  fullName: string;
  department: string;
  bio: string;
}) {
  const { data: existingProfile } = await supabase
    .from("supervisors")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .maybeSingle<{ id: string }>();

  if (existingProfile) {
    const { data: updatedProfile, error } = await supabase
      .from("supervisors")
      .update({
        full_name: input.fullName,
        department: input.department,
        bio: input.bio,
      })
      .eq("id", existingProfile.id)
      .select("id")
      .single<{ id: string }>();

    if (error || !updatedProfile) {
      throw new Error("Unable to update supervisor profile.");
    }

    return updatedProfile.id;
  }

  const { data: createdProfile, error } = await supabase
    .from("supervisors")
    .insert({
      user_id: input.userId,
      organization_id: input.organizationId,
      full_name: input.fullName,
      department: input.department,
      bio: input.bio,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !createdProfile) {
    throw new Error("Unable to create supervisor profile.");
  }

  return createdProfile.id;
}

async function resetProjectScopedData(organizationId: string, projectTitles: string[]) {
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("organization_id", organizationId)
    .in("title", projectTitles)
    .returns<Array<{ id: string }>>();

  const projectIds = (projects ?? []).map((project) => project.id);

  if (projectIds.length === 0) {
    return;
  }

  const { data: documents } = await supabase
    .from("project_documents")
    .select("id")
    .in("project_id", projectIds)
    .returns<Array<{ id: string }>>();

  const documentIds = (documents ?? []).map((document) => document.id);
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .in("project_id", projectIds)
    .returns<Array<{ id: string }>>();
  const taskIds = (tasks ?? []).map((task) => task.id);

  if (taskIds.length > 0) {
    await supabase.from("task_progress").delete().in("task_id", taskIds);
    await supabase.from("tasks").delete().in("id", taskIds);
  }

  if (documentIds.length > 0) {
    await supabase
      .from("project_document_analyses")
      .delete()
      .in("document_id", documentIds);
    await supabase.from("project_documents").delete().in("id", documentIds);
  }

  await supabase.from("ai_recommendations").delete().in("project_id", projectIds);
  await supabase.from("projects").delete().in("id", projectIds);
}

async function createProject(input: {
  organizationId: string;
  createdByUserId: string;
  title: string;
  description: string;
  requiredSkills: string[];
}) {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: input.organizationId,
      created_by_user_id: input.createdByUserId,
      title: input.title,
      description: input.description,
      status: "active",
      priority: "high",
      required_skills: input.requiredSkills,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Unable to create project ${input.title}.`);
  }

  return data.id;
}

async function createTask(input: {
  projectId: string;
  createdByUserId: string;
  assignedEmployeeId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "blocked" | "review" | "completed";
  priority: "medium" | "high" | "urgent";
  estimatedHours: number;
}) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: input.projectId,
      created_by_user_id: input.createdByUserId,
      assigned_employee_id: input.assignedEmployeeId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimatedHours,
      assigned_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Unable to create task ${input.title}.`);
  }

  return data.id;
}

async function createTaskProgress(input: {
  taskId: string;
  employeeId: string;
  progressPercentage: number;
  status: "in_progress" | "blocked" | "completed";
  notes: string;
}) {
  const { error } = await supabase.from("task_progress").insert({
    task_id: input.taskId,
    employee_id: input.employeeId,
    progress_percentage: input.progressPercentage,
    status: input.status,
    notes: input.notes,
  });

  if (error) {
    throw new Error("Unable to create task progress.");
  }
}

async function createProjectDocument(input: {
  projectId: string;
  uploadedByUserId: string;
  originalFilename: string;
  storagePath: string;
  extractedText: string;
}) {
  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: input.projectId,
      uploaded_by_user_id: input.uploadedByUserId,
      storage_bucket: "project-documents",
      storage_path: input.storagePath,
      original_filename: input.originalFilename,
      mime_type: "text/plain",
      size_bytes: Buffer.byteLength(input.extractedText, "utf8"),
      extracted_text: input.extractedText,
      extraction_status: "extracted",
      extraction_error: null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error("Unable to create project document.");
  }

  return data.id;
}

async function createProjectAnalysis(input: {
  projectId: string;
  documentId: string;
  summary: string;
  estimatedHours: number;
  requiredSkills: string[];
}) {
  const { data, error } = await supabase
    .from("project_document_analyses")
    .insert({
      project_id: input.projectId,
      document_id: input.documentId,
      required_skills: input.requiredSkills,
      preferred_skills: input.requiredSkills,
      complexity: "medium",
      estimated_hours: input.estimatedHours,
      summary: input.summary,
      suggested_roles: ["employee"],
      risks: ["Tenant isolation verification dataset"],
      provider: "verification-seed",
      model: null,
      raw_result: {
        source: "tenant-isolation-seed",
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error("Unable to create project analysis.");
  }

  return data.id;
}

async function createRecommendationRun(input: {
  projectId: string;
  analysisId: string;
  generatedByUserId: string;
  employees: Array<{
    employeeId: string;
    employeeName: string;
    matchedSkills: string[];
    missingSkills: string[];
    matchScore: number;
    confidenceScore: number;
  }>;
}) {
  const recommendationRunId = crypto.randomUUID();
  const { error } = await supabase.from("ai_recommendations").insert(
    input.employees.map((employee, index) => ({
      project_id: input.projectId,
      analysis_id: input.analysisId,
      recommendation_run_id: recommendationRunId,
      employee_id: employee.employeeId,
      generated_by_user_id: input.generatedByUserId,
      rank: index + 1,
      match_score: employee.matchScore,
      confidence_score: employee.confidenceScore,
      matched_skills: employee.matchedSkills,
      missing_skills: employee.missingSkills,
      score_breakdown: {
        skillMatch: employee.matchScore,
        availability: 80,
        performance: 85,
        workload: 75,
      },
      summary: `${employee.employeeName} is ranked for tenant isolation verification.`,
    }))
  );

  if (error) {
    throw new Error("Unable to create recommendation rows.");
  }
}

export async function seedTenantIsolationDataset(): Promise<DatasetContext> {
  logSeedEvent("start", {});

  const users = Object.fromEntries(
    await Promise.all(
      TEST_USERS.map(async (definition) => [
        definition.key,
        await ensureAppUser(definition),
      ])
    )
  ) as Record<string, SeededUser>;

  const organizationA = await ensureOrganization(
    "tenant-isolation-org-a",
    "Organization A",
    users.organizationAdminA.id
  );
  const organizationB = await ensureOrganization(
    "tenant-isolation-org-b",
    "Organization B",
    users.organizationAdminB.id
  );

  const memberships = {
    organizationAdminA: await ensureMembership({
      organizationId: organizationA.id,
      userId: users.organizationAdminA.id,
      role: "organization_admin",
      status: "active",
      invitedByUserId: users.organizationAdminA.id,
    }),
    supervisorA: await ensureMembership({
      organizationId: organizationA.id,
      userId: users.supervisorA.id,
      role: "supervisor",
      status: "active",
      invitedByUserId: users.organizationAdminA.id,
    }),
    employeeA: await ensureMembership({
      organizationId: organizationA.id,
      userId: users.employeeA.id,
      role: "employee",
      status: "active",
      invitedByUserId: users.organizationAdminA.id,
    }),
    organizationAdminB: await ensureMembership({
      organizationId: organizationB.id,
      userId: users.organizationAdminB.id,
      role: "organization_admin",
      status: "active",
      invitedByUserId: users.organizationAdminB.id,
    }),
    supervisorB: await ensureMembership({
      organizationId: organizationB.id,
      userId: users.supervisorB.id,
      role: "supervisor",
      status: "active",
      invitedByUserId: users.organizationAdminB.id,
    }),
    employeeB: await ensureMembership({
      organizationId: organizationB.id,
      userId: users.employeeB.id,
      role: "employee",
      status: "active",
      invitedByUserId: users.organizationAdminB.id,
    }),
    dualRoleSupervisorA: await ensureMembership({
      organizationId: organizationA.id,
      userId: users.dualRoleUser.id,
      role: "supervisor",
      status: "active",
      invitedByUserId: users.organizationAdminA.id,
    }),
    dualRoleEmployeeB: await ensureMembership({
      organizationId: organizationB.id,
      userId: users.dualRoleUser.id,
      role: "employee",
      status: "active",
      invitedByUserId: users.organizationAdminB.id,
    }),
    invitedUser: await ensureMembership({
      organizationId: organizationA.id,
      userId: users.invitedUser.id,
      role: "employee",
      status: "invited",
      invitedByUserId: users.organizationAdminA.id,
    }),
    suspendedUser: await ensureMembership({
      organizationId: organizationB.id,
      userId: users.suspendedUser.id,
      role: "employee",
      status: "suspended",
      invitedByUserId: users.organizationAdminB.id,
    }),
  };

  await ensureInvitation({
    organizationId: organizationA.id,
    membershipId: memberships.invitedUser.id,
    invitedByUserId: users.organizationAdminA.id,
    role: "employee",
    user: users.invitedUser,
    profile: {
      full_name: "Invited Employee",
      bio: "Pending invitation",
      employment_type: "full_time",
      weekly_capacity_hours: 40,
      skills: [],
    },
  });

  const employeeAProfileId = await ensureEmployeeProfile({
    organizationId: organizationA.id,
    userId: users.employeeA.id,
    fullName: "Employee A",
    bio: "Employee in organization A",
    employmentType: "full_time",
    weeklyCapacityHours: 40,
  });
  const employeeBProfileId = await ensureEmployeeProfile({
    organizationId: organizationB.id,
    userId: users.employeeB.id,
    fullName: "Employee B",
    bio: "Employee in organization B",
    employmentType: "full_time",
    weeklyCapacityHours: 40,
  });
  const dualRoleEmployeeBProfileId = await ensureEmployeeProfile({
    organizationId: organizationB.id,
    userId: users.dualRoleUser.id,
    fullName: "Dual Role User",
    bio: "Employee in organization B",
    employmentType: "part_time",
    weeklyCapacityHours: 20,
  });

  await ensureSupervisorProfile({
    organizationId: organizationA.id,
    userId: users.organizationAdminA.id,
    fullName: "Organization Admin A",
    department: "Leadership",
    bio: "Organization admin for org A",
  });
  await ensureSupervisorProfile({
    organizationId: organizationA.id,
    userId: users.supervisorA.id,
    fullName: "Supervisor A",
    department: "Engineering",
    bio: "Supervisor in organization A",
  });
  await ensureSupervisorProfile({
    organizationId: organizationB.id,
    userId: users.organizationAdminB.id,
    fullName: "Organization Admin B",
    department: "Leadership",
    bio: "Organization admin for org B",
  });
  await ensureSupervisorProfile({
    organizationId: organizationB.id,
    userId: users.supervisorB.id,
    fullName: "Supervisor B",
    department: "Engineering",
    bio: "Supervisor in organization B",
  });
  await ensureSupervisorProfile({
    organizationId: organizationA.id,
    userId: users.dualRoleUser.id,
    fullName: "Dual Role User",
    department: "Operations",
    bio: "Supervisor in organization A",
  });

  await resetProjectScopedData(organizationA.id, [PROJECT_A_TITLE]);
  await resetProjectScopedData(organizationB.id, [PROJECT_B_TITLE]);

  const projectAId = await createProject({
    organizationId: organizationA.id,
    createdByUserId: users.organizationAdminA.id,
    title: PROJECT_A_TITLE,
    description: "Project data for organization A tenant isolation verification.",
    requiredSkills: ["react", "sql"],
  });
  const projectBId = await createProject({
    organizationId: organizationB.id,
    createdByUserId: users.organizationAdminB.id,
    title: PROJECT_B_TITLE,
    description: "Project data for organization B tenant isolation verification.",
    requiredSkills: ["node", "postgresql"],
  });

  const taskAId = await createTask({
    projectId: projectAId,
    createdByUserId: users.organizationAdminA.id,
    assignedEmployeeId: employeeAProfileId,
    title: TASK_A_TITLE,
    description: "Org A employee task",
    status: "in_progress",
    priority: "high",
    estimatedHours: 8,
  });
  const taskBId = await createTask({
    projectId: projectBId,
    createdByUserId: users.organizationAdminB.id,
    assignedEmployeeId: employeeBProfileId,
    title: TASK_B_TITLE,
    description: "Org B employee task",
    status: "todo",
    priority: "medium",
    estimatedHours: 6,
  });
  const taskCrossBId = await createTask({
    projectId: projectBId,
    createdByUserId: users.organizationAdminB.id,
    assignedEmployeeId: dualRoleEmployeeBProfileId,
    title: TASK_B_CROSS_TITLE,
    description: "Org B dual-role employee task",
    status: "blocked",
    priority: "urgent",
    estimatedHours: 4,
  });

  await createTaskProgress({
    taskId: taskAId,
    employeeId: employeeAProfileId,
    progressPercentage: 55,
    status: "in_progress",
    notes: "Org A progress update",
  });
  await createTaskProgress({
    taskId: taskCrossBId,
    employeeId: dualRoleEmployeeBProfileId,
    progressPercentage: 20,
    status: "blocked",
    notes: "Org B blocked progress update",
  });

  const documentAId = await createProjectDocument({
    projectId: projectAId,
    uploadedByUserId: users.organizationAdminA.id,
    originalFilename: DOCUMENT_A_FILENAME,
    storagePath: `tenant-isolation/org-a/${DOCUMENT_A_FILENAME}`,
    extractedText: "Organization A project document content",
  });
  const documentBId = await createProjectDocument({
    projectId: projectBId,
    uploadedByUserId: users.organizationAdminB.id,
    originalFilename: DOCUMENT_B_FILENAME,
    storagePath: `tenant-isolation/org-b/${DOCUMENT_B_FILENAME}`,
    extractedText: "Organization B project document content",
  });

  const analysisAId = await createProjectAnalysis({
    projectId: projectAId,
    documentId: documentAId,
    summary: "Analysis for organization A",
    estimatedHours: 24,
    requiredSkills: ["react", "sql"],
  });
  const analysisBId = await createProjectAnalysis({
    projectId: projectBId,
    documentId: documentBId,
    summary: "Analysis for organization B",
    estimatedHours: 18,
    requiredSkills: ["node", "postgresql"],
  });

  await createRecommendationRun({
    projectId: projectAId,
    analysisId: analysisAId,
    generatedByUserId: users.organizationAdminA.id,
    employees: [
      {
        employeeId: employeeAProfileId,
        employeeName: "Employee A",
        matchedSkills: ["react", "sql"],
        missingSkills: [],
        matchScore: 91,
        confidenceScore: 88,
      },
    ],
  });
  await createRecommendationRun({
    projectId: projectBId,
    analysisId: analysisBId,
    generatedByUserId: users.organizationAdminB.id,
    employees: [
      {
        employeeId: employeeBProfileId,
        employeeName: "Employee B",
        matchedSkills: ["node"],
        missingSkills: ["postgresql"],
        matchScore: 82,
        confidenceScore: 79,
      },
      {
        employeeId: dualRoleEmployeeBProfileId,
        employeeName: "Dual Role User",
        matchedSkills: ["postgresql"],
        missingSkills: ["node"],
        matchScore: 77,
        confidenceScore: 73,
      },
    ],
  });

  logSeedEvent("complete", {
    organizationCount: 2,
    userCount: TEST_USERS.length,
  });

  return {
    organizations: {
      organizationA,
      organizationB,
    },
    users,
    memberships,
    resources: {
      projectAId,
      projectBId,
      taskAId,
      taskBId,
      taskCrossBId,
      documentAId,
      documentBId,
      employeeAProfileId,
      employeeBProfileId,
      dualRoleEmployeeBProfileId,
    },
  };
}

export function getTenantIsolationCredentials() {
  return {
    password: TEST_PASSWORD,
    users: TEST_USERS,
  };
}

async function main() {
  const context = await seedTenantIsolationDataset();
  console.log(
    JSON.stringify(
      {
        scope: "tenant_isolation_seed",
        result: {
          organizations: context.organizations,
          resourceIds: context.resources,
        },
      },
      null,
      2
    )
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}

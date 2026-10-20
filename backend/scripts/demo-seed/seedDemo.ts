/**
 * Dev-only demo seed: builds one complete organization that exercises every major feature.
 *
 *   npm run seed:demo -- --confirm
 *
 * - Everything it creates is marked twice: metadata {"seed":"demo"} on the org, users, Auth users
 *   and teams, plus the org name "Demo Org [SEED]" and seed+<name>@example.test emails.
 * - Re-running first removes the previous demo data, so the result is always the same.
 * - Goes through the real services (so capacity, performance and project progress are
 *   recalculated) and the real Gemini analysis. If Gemini fails it stops; it never inserts
 *   fake analysis rows.
 * - Invitation emails go to the console only.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Must be set before any invitation is created: no real email leaves this script.
process.env.TRANSACTIONAL_EMAIL_PROVIDER = "console";

const { supabase } = await import("../../src/config/supabase.js");
const { createOrganizationForAuthenticatedUser, createOrganizationInvitation, revokeOrganizationInvitation } =
  await import("../../src/services/organizationService.js");
const { createEmployeeProfileRecordForOrganization } = await import("../../src/services/employeeService.js");
const { createSupervisorProfileRecordForOrganization } = await import("../../src/services/supervisorService.js");
const { replaceEmployeeSkillsWithDetails } = await import("../../src/services/skillService.js");
const { createProject } = await import("../../src/services/projectService.js");
const { uploadProjectDocument } = await import("../../src/services/projectDocumentService.js");
const { createTask, createTaskProgress, updateTask } = await import("../../src/services/taskService.js");
const { assignRecommendedEmployee, generateProjectRecommendations } = await import("../../src/services/recommendationService.js");
const { assertSafeToRun, cleanDemoData, DEMO_ORG_NAME, DEMO_ORG_SLUG, readDemoPassword, SEED_METADATA, seedEmail } =
  await import("./shared.js");

type EmploymentType = "full_time" | "part_time";
type TaskStatus = "todo" | "in_progress" | "blocked" | "review" | "completed" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";

interface SeedPerson {
  appUserId: string;
  authUserId: string;
  email: string;
  name: string;
}

interface SeedEmployee extends SeedPerson {
  employeeId: string;
}

// ---------- Data ----------

const ADMIN = { key: "admin", name: "Avery Morgan", department: "Operations", bio: "Runs delivery operations and owns staffing decisions." };

const SUPERVISORS = [
  { key: "jordan", name: "Jordan Reyes", department: "Engineering", bio: "Leads the product engineering squads." },
  { key: "priya", name: "Priya Nair", department: "Data & Analytics", bio: "Leads analytics and data platform work." },
];

// Departments double as teams; the app has no separate team model.
const EMPLOYEES: Array<{
  key: string;
  name: string;
  title: string;
  department: string;
  employment: EmploymentType;
  hours: number;
  bio: string;
  skills: Array<[name: string, proficiency: number, years: number | null]>;
}> = [
  { key: "lena", name: "Lena Ortiz", title: "Senior Frontend Engineer", department: "Engineering", employment: "full_time", hours: 40, bio: "Builds data-heavy React interfaces.", skills: [["React", 5, 7], ["TypeScript", 5, 6], ["Data visualization", 4, 4], ["Design systems", 3, 2]] },
  { key: "marcus", name: "Marcus Lee", title: "Backend Engineer", department: "Engineering", employment: "full_time", hours: 40, bio: "API and database work.", skills: [["Node.js", 5, 6], ["Express", 4, 5], ["PostgreSQL", 4, 5], ["REST APIs", 4, 5]] },
  { key: "aisha", name: "Aisha Bello", title: "Full-stack Engineer", department: "Engineering", employment: "full_time", hours: 40, bio: "Comfortable across the stack, strong on Supabase.", skills: [["React", 4, 4], ["Node.js", 4, 4], ["PostgreSQL", 3, 3], ["Supabase", 4, 2], ["TypeScript", 4, 4], ["Row-level security", 3, 2]] },
  { key: "daniel", name: "Daniel Kim", title: "Data Engineer", department: "Data & Analytics", employment: "full_time", hours: 40, bio: "Query tuning and pipelines.", skills: [["PostgreSQL", 5, 8], ["SQL", 5, 8], ["Python", 4, 5], ["Data visualization", 3, 3]] },
  { key: "tomas", name: "Tomás Silva", title: "QA Engineer", department: "Quality", employment: "part_time", hours: 24, bio: "Automates the boring checks.", skills: [["Integration testing", 4, 4], ["Playwright", 3, 2], ["REST APIs", 3, 2], ["Storybook", 3, 2]] },
  { key: "sara", name: "Sara Novak", title: "Frontend Engineer", department: "Engineering", employment: "part_time", hours: 20, bio: "Accessibility-minded frontend work.", skills: [["React", 3, 2], ["TypeScript", 3, 2], ["Accessibility testing", 3, 2]] },
  { key: "kenji", name: "Kenji Watanabe", title: "DevOps Engineer", department: "Platform", employment: "full_time", hours: 32, bio: "CI/CD and infrastructure.", skills: [["Docker", 4, 5], ["Kubernetes", 3, 3], ["AWS", 4, 4], ["CI/CD", 4, 5], ["Node.js", 2, 1], ["Pulumi", 2, 1], ["Grafana", 3, 2]] },
  { key: "fatima", name: "Fatima Haddad", title: "Product Designer", department: "Design", employment: "part_time", hours: 16, bio: "Design systems and research.", skills: [["Figma", 5, 6], ["UX research", 4, 5], ["Design systems", 4, 4]] },
  { key: "noah", name: "Noah Brooks", title: "Junior Backend Developer", department: "Engineering", employment: "part_time", hours: 10, bio: "Learning the backend.", skills: [["Node.js", 2, 1], ["Express", 2, 1], ["PostgreSQL", 2, 1]] },
];

// Left pending so the platform admin skill queue has real entries.
// Read-only teams; an employee can belong to more than one (Aisha does).
const TEAMS: Array<{ name: string; description: string; lead: string; members: string[] }> = [
  { name: "Product Engineering", description: "Customer-facing product work.", lead: "jordan", members: ["lena", "marcus", "aisha", "sara", "noah"] },
  { name: "Platform & Data", description: "Data pipelines, infrastructure and delivery tooling.", lead: "priya", members: ["daniel", "kenji", "aisha"] },
  { name: "Design & Quality", description: "Design system, research and test automation.", lead: "admin", members: ["fatima", "tomas"] },
];

// Not in the pre-approved catalog, so they land in the platform admin queue (after the AI check).
const PENDING_SKILLS = new Set(["Storybook", "Pulumi", "Grafana"]);

const PROJECTS: Array<{
  key: string;
  title: string;
  description: string;
  status: "draft" | "active" | "on_hold" | "completed";
  priority: Priority;
  requiredSkills: string[];
  spec?: string;
}> = [
  { key: "analytics", title: "Internal Analytics Dashboard Revamp", description: "Rebuild the operations analytics dashboard: faster, responsive, and easier to extend.", status: "active", priority: "high", requiredSkills: ["React", "TypeScript", "Node.js", "PostgreSQL"], spec: "project-spec-analytics-dashboard.txt" },
  { key: "onboarding", title: "Customer Onboarding API", description: "Replace spreadsheet onboarding with an audited API and automated milestones.", status: "active", priority: "urgent", requiredSkills: ["Node.js", "Express", "PostgreSQL", "Supabase"], spec: "project-spec-onboarding-api.txt" },
  { key: "scanner", title: "Warehouse Scanner Rollout", description: "Replace end-of-life scanners and move scanning to the v2 inventory API.", status: "on_hold", priority: "medium", requiredSkills: ["Node.js", "REST APIs", "PostgreSQL"], spec: "project-spec-warehouse-scanner.txt" },
  { key: "design", title: "Design System Refresh", description: "Audit components, publish tokens and document the system.", status: "completed", priority: "low", requiredSkills: ["Figma", "Design systems", "React"] },
  { key: "security", title: "Q1 Security Review", description: "Scope a penetration test and review access controls.", status: "draft", priority: "medium", requiredSkills: ["Security"] },
];

type ProgressStep = [percent: number, status: TaskStatus | null, note: string | null];

const TASKS: Array<{
  project: string;
  title: string;
  hours: number;
  priority: Priority;
  dueInDays: number;
  assignee: string | null;
  finalStatus: TaskStatus;
  progress: ProgressStep[];
  /** Assign this task later from the project's recommendation run instead. */
  viaRecommendation?: boolean;
}> = [
  // Analytics dashboard (active)
  { project: "analytics", title: "Dashboard layout and design tokens", hours: 8, priority: "medium", dueInDays: -12, assignee: "lena", finalStatus: "completed", progress: [[50, "in_progress", "Layout grid and tokens drafted."], [100, "completed", "Signed off by operations."]] },
  { project: "analytics", title: "Aggregate analytics API endpoints", hours: 16, priority: "high", dueInDays: 5, assignee: "marcus", finalStatus: "in_progress", progress: [[25, "in_progress", "Endpoint contracts agreed."], [50, "in_progress", "Daily and weekly aggregates live."]] },
  { project: "analytics", title: "Optimize PostgreSQL aggregate queries", hours: 12, priority: "high", dueInDays: -1, assignee: "daniel", finalStatus: "review", progress: [[60, "in_progress", "Added covering indexes."], [90, "review", "p95 down from 4.2s to 380ms. Ready for review."]] },
  { project: "analytics", title: "Chart components for large datasets", hours: 14, priority: "high", dueInDays: 9, assignee: null, finalStatus: "in_progress", progress: [[20, "in_progress", "Virtualized table prototype."]], viaRecommendation: true },
  { project: "analytics", title: "Responsive tablet layout", hours: 10, priority: "medium", dueInDays: 14, assignee: null, finalStatus: "todo", progress: [] },
  { project: "analytics", title: "Usability check with operations team", hours: 6, priority: "low", dueInDays: -3, assignee: "sara", finalStatus: "blocked", progress: [[30, "blocked", "Waiting for operations to schedule the session."]] },
  // Onboarding API (active)
  { project: "onboarding", title: "Onboarding state machine and schema", hours: 20, priority: "urgent", dueInDays: 7, assignee: "aisha", finalStatus: "in_progress", progress: [[20, "in_progress", "Schema drafted."], [45, "in_progress", "State transitions implemented."], [60, "in_progress", "Audit log hooks added."]] },
  { project: "onboarding", title: "Audit logging for onboarding steps", hours: 8, priority: "high", dueInDays: 10, assignee: "noah", finalStatus: "todo", progress: [] },
  { project: "onboarding", title: "Supabase RLS for client isolation", hours: 10, priority: "urgent", dueInDays: -2, assignee: "marcus", finalStatus: "blocked", progress: [[15, "blocked", "Blocked on the tenant id decision from security."]] },
  { project: "onboarding", title: "Milestone notification emails", hours: 6, priority: "medium", dueInDays: 15, assignee: null, finalStatus: "todo", progress: [] },
  { project: "onboarding", title: "Integration tests for the onboarding flow", hours: 12, priority: "high", dueInDays: 9, assignee: "tomas", finalStatus: "in_progress", progress: [[30, "in_progress", "Happy path covered."], [55, "in_progress", "Verification failure paths covered."]] },
  { project: "onboarding", title: "Internal admin status view", hours: 8, priority: "low", dueInDays: 20, assignee: null, finalStatus: "cancelled", progress: [] },
  // Warehouse scanner (on hold)
  { project: "scanner", title: "Scanner hardware evaluation", hours: 6, priority: "medium", dueInDays: -20, assignee: "kenji", finalStatus: "completed", progress: [[100, "completed", "Recommended the Zebra TC22."]] },
  { project: "scanner", title: "Offline sync prototype", hours: 12, priority: "medium", dueInDays: -6, assignee: "noah", finalStatus: "blocked", progress: [[25, "blocked", "Paused until the hardware budget is approved."]] },
  { project: "scanner", title: "Device fleet CI pipeline", hours: 8, priority: "low", dueInDays: 25, assignee: "kenji", finalStatus: "todo", progress: [] },
  // Design system (completed)
  { project: "design", title: "Audit existing components", hours: 10, priority: "medium", dueInDays: -40, assignee: "fatima", finalStatus: "completed", progress: [[60, "in_progress", "Inventory done."], [100, "completed", "Audit published."]] },
  { project: "design", title: "Publish the token package", hours: 6, priority: "low", dueInDays: -30, assignee: "lena", finalStatus: "completed", progress: [[100, "completed", "v1.0 published."]] },
  { project: "design", title: "Component documentation site", hours: 8, priority: "low", dueInDays: -25, assignee: "fatima", finalStatus: "completed", progress: [[100, "completed", "Docs site live."]] },
  // Security review (draft)
  { project: "security", title: "Draft penetration test scope", hours: 4, priority: "medium", dueInDays: 21, assignee: null, finalStatus: "todo", progress: [] },
];

// ---------- Helpers ----------

function dueDate(daysFromToday: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function step(message: string) {
  console.log(`\n▸ ${message}`);
}

async function createSeedPerson(key: string, name: string, legacyRole: "supervisor" | "employee", password: string): Promise<SeedPerson> {
  const email = seedEmail(key);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { ...SEED_METADATA },
  });
  if (error || !data.user) throw new Error(`Unable to create Auth user ${email}: ${error?.message}`);

  // Raw insert: the managed-user service sends a real invite email instead.
  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({ auth_user_id: data.user.id, email, role: legacyRole, metadata: SEED_METADATA })
    .select("id")
    .single<{ id: string }>();
  if (userError || !user) throw new Error(`Unable to create app user ${email}: ${userError?.message}`);

  return { appUserId: user.id, authUserId: data.user.id, email, name };
}

async function addMembership(organizationId: string, userId: string, role: "supervisor" | "employee", invitedBy: string) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: userId,
    role,
    status: "active",
    invited_by_user_id: invitedBy,
    invited_at: now,
    joined_at: now,
  });
  if (error) throw new Error(`Unable to add ${role} membership: ${error.message}`);
}

async function countRows(table: string, column: string, values: string[]) {
  if (values.length === 0) return 0;
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).in(column, values);
  if (error) throw new Error(`Unable to count ${table}: ${error.message}`);
  return count ?? 0;
}

// ---------- Seed ----------

async function main() {
  assertSafeToRun(`create "${DEMO_ORG_NAME}" (replacing any previous demo data)`);
  const password = readDemoPassword();
  const notSeeded: string[] = [];

  step("Removing previous demo data");
  const cleanup = await cleanDemoData();
  console.log(`  removed: org ${cleanup.organization ? "yes" : "none"}, ${cleanup.appUsers} app users, ${cleanup.authUsers} Auth users, ${cleanup.documentFiles} files`);

  step("People and organization");
  const admin = await createSeedPerson(ADMIN.key, ADMIN.name, "supervisor", password);
  const { organization } = await createOrganizationForAuthenticatedUser(admin.authUserId, { name: DEMO_ORG_NAME, slug: DEMO_ORG_SLUG });
  const orgId = organization.id;
  const { error: orgFlagError } = await supabase.from("organizations").update({ metadata: SEED_METADATA }).eq("id", orgId);
  if (orgFlagError) throw new Error(`Unable to flag the demo organization: ${orgFlagError.message}`);
  const supervisorProfileIds = new Map<string, string>();
  const adminProfile = await createSupervisorProfileRecordForOrganization({ userId: admin.appUserId, full_name: ADMIN.name, department: ADMIN.department, bio: ADMIN.bio, organization_id: orgId });
  supervisorProfileIds.set(ADMIN.key, adminProfile.id as string);

  const supervisors: SeedPerson[] = [];
  for (const definition of SUPERVISORS) {
    const person = await createSeedPerson(definition.key, definition.name, "supervisor", password);
    await addMembership(orgId, person.appUserId, "supervisor", admin.appUserId);
    const profile = await createSupervisorProfileRecordForOrganization({ userId: person.appUserId, full_name: definition.name, department: definition.department, bio: definition.bio, organization_id: orgId });
    supervisorProfileIds.set(definition.key, profile.id as string);
    supervisors.push(person);
  }

  const employees = new Map<string, SeedEmployee>();
  const orgSkillIds = new Set<string>();
  for (const definition of EMPLOYEES) {
    const person = await createSeedPerson(definition.key, definition.name, "employee", password);
    await addMembership(orgId, person.appUserId, "employee", admin.appUserId);
    const profile = await createEmployeeProfileRecordForOrganization({
      userId: person.appUserId,
      full_name: definition.name,
      job_title: definition.title,
      department: definition.department,
      bio: definition.bio,
      employment_type: definition.employment,
      weekly_capacity_hours: definition.hours,
      organization_id: orgId,
    });
    const result = await replaceEmployeeSkillsWithDetails(
      profile.id,
      person.appUserId,
      definition.skills.map(([name, proficiency, years]) => ({ name, proficiency_level: proficiency, years_of_experience: years })),
      orgId
    );
    result.createdSkillIds.forEach((id) => orgSkillIds.add(id));
    employees.set(definition.key, { ...person, employeeId: profile.id });
  }
  console.log(`  1 admin, ${supervisors.length} supervisors, ${employees.size} employees`);

  step("Teams");
  for (const definition of TEAMS) {
    // Raw insert: teams are read-only in the app, so there is no create service.
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        organization_id: orgId,
        name: definition.name,
        description: definition.description,
        lead_supervisor_id: supervisorProfileIds.get(definition.lead) ?? null,
        metadata: SEED_METADATA,
      })
      .select("id")
      .single<{ id: string }>();
    if (teamError || !team) throw new Error(`Unable to create team ${definition.name}: ${teamError?.message}`);
    const { error: membersError } = await supabase
      .from("team_members")
      .insert(definition.members.map((key) => ({ team_id: team.id, employee_id: (employees.get(key) as SeedEmployee).employeeId })));
    if (membersError) throw new Error(`Unable to add members to ${definition.name}: ${membersError.message}`);
  }
  console.log(`  ${TEAMS.length} teams`);

  step("Skills");
  // Catalog skills link straight away; only skills new to the app are created, as pending.
  const { data: createdSkills } = orgSkillIds.size
    ? await supabase.from("skills").select("name, is_approved").in("id", [...orgSkillIds])
    : { data: [] as Array<{ name: string; is_approved: boolean }> };
  const pendingNames = (createdSkills ?? []).filter((skill) => !skill.is_approved).map((skill) => skill.name as string);
  console.log(`  ${pendingNames.length} new skills pending platform approval${pendingNames.length ? `: ${pendingNames.join(", ")}` : ""}`);

  step("Projects");
  const projectIds = new Map<string, string>();
  for (const definition of PROJECTS) {
    const project = await createProject(admin.authUserId, orgId, {
      title: definition.title,
      description: definition.description,
      status: definition.status,
      priority: definition.priority,
      requiredSkills: definition.requiredSkills,
    });
    projectIds.set(definition.key, project.id as string);
  }
  console.log(`  ${projectIds.size} projects`);

  step("Requirement documents through the real Gemini analysis");
  const specDir = fileURLToPath(new URL("./specs/", import.meta.url));
  for (const definition of PROJECTS.filter((project) => project.spec)) {
    const buffer = await readFile(`${specDir}${definition.spec}`);
    try {
      const { analysis } = await uploadProjectDocument(admin.authUserId, orgId, projectIds.get(definition.key) as string, {
        originalName: definition.spec as string,
        mimeType: "text/plain",
        size: buffer.byteLength,
        buffer,
      });
      console.log(`  ${definition.spec}: analyzed (${analysis?.estimated_hours ?? "?"}h, ${analysis?.complexity ?? "?"} complexity)`);
    } catch (error) {
      console.error(`\nGemini analysis failed for ${definition.spec}: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Stopping without inserting any fake analysis. Partial demo data remains; run `npm run seed:demo:clean -- --confirm` to remove it.");
      process.exit(1);
    }
  }

  step("Tasks");
  const taskIds = new Map<string, string>();
  for (const definition of TASKS) {
    const assignee = definition.assignee ? employees.get(definition.assignee) : undefined;
    const task = await createTask(admin.authUserId, orgId, {
      projectId: projectIds.get(definition.project) as string,
      title: definition.title,
      priority: definition.priority,
      estimatedHours: definition.hours,
      dueDate: dueDate(definition.dueInDays),
      assignedEmployeeId: assignee?.employeeId,
    });
    taskIds.set(definition.title, task.id as string);
  }
  console.log(`  ${taskIds.size} tasks`);

  step("AI recommendations (real service) and accepted assignments");
  const acceptedFromRecommendations = new Map<string, SeedEmployee>();
  const employeeById = new Map([...employees.values()].map((employee) => [employee.employeeId, employee]));
  for (const projectKey of ["analytics", "onboarding"]) {
    const projectId = projectIds.get(projectKey) as string;
    const run = await generateProjectRecommendations(admin.authUserId, orgId, projectId);
    const top = run.recommendations.find((recommendation) => employeeById.has(recommendation.employeeId));
    console.log(`  ${projectKey}: ${run.recommendations.length} ranked, top ${top ? employeeById.get(top.employeeId)?.name : "none"}`);
    if (!top) {
      notSeeded.push(`Accepted recommendation for ${projectKey}: the run returned no candidates.`);
      continue;
    }

    if (projectKey === "analytics") {
      const title = "Chart components for large datasets";
      await assignRecommendedEmployee(admin.authUserId, orgId, projectId, {
        recommendationRunId: run.recommendationRunId,
        employeeId: top.employeeId,
        taskId: taskIds.get(title),
      });
      acceptedFromRecommendations.set(title, employeeById.get(top.employeeId) as SeedEmployee);
    } else {
      const result = await assignRecommendedEmployee(admin.authUserId, orgId, projectId, {
        recommendationRunId: run.recommendationRunId,
        employeeId: top.employeeId,
        task: { title: "Onboarding REST endpoints", priority: "high", estimatedHours: 16, dueDate: dueDate(12), description: "Created from an accepted AI recommendation." },
      });
      taskIds.set("Onboarding REST endpoints", result.task.id as string);
      const employee = employeeById.get(top.employeeId) as SeedEmployee;
      await createTaskProgress(employee.authUserId, orgId, result.task.id as string, { progressPercentage: 15, status: "in_progress", notes: "Scaffolded the routes." }, "employee");
    }
  }

  step("Progress updates (recalculates workload, availability, performance and project progress)");
  let progressCount = 0;
  for (const definition of TASKS) {
    const taskId = taskIds.get(definition.title) as string;
    if (definition.finalStatus === "cancelled") {
      await updateTask(admin.authUserId, orgId, taskId, { status: "cancelled" });
      continue;
    }
    const worker = definition.viaRecommendation
      ? acceptedFromRecommendations.get(definition.title)
      : definition.assignee ? employees.get(definition.assignee) : undefined;
    if (!worker) continue;
    for (const [percent, status, note] of definition.progress) {
      await createTaskProgress(worker.authUserId, orgId, taskId, { progressPercentage: percent, status: status ?? undefined, notes: note ?? undefined }, "employee");
      progressCount += 1;
    }
  }
  console.log(`  ${progressCount} progress updates`);

  step("Invitations (email provider: console)");
  const pending = await createOrganizationInvitation(admin.authUserId, orgId, {
    email: seedEmail("invite-pending"),
    role: "employee",
    profile: { full_name: "Riley Chen", job_title: "Data Analyst", department: "Data & Analytics", employment_type: "full_time", weekly_capacity_hours: 40 },
  });
  const expired = await createOrganizationInvitation(admin.authUserId, orgId, {
    email: seedEmail("invite-expired"),
    role: "employee",
    profile: { full_name: "Sam Patel", job_title: "QA Analyst", department: "Quality", employment_type: "part_time", weekly_capacity_hours: 20 },
  });
  // Raw update: there is no service for expiring an invitation early.
  const { error: expireError } = await supabase
    .from("organization_invitations")
    .update({ expires_at: new Date(Date.now() - 2 * 86_400_000).toISOString() })
    .eq("id", expired.invitation.id);
  if (expireError) throw new Error(`Unable to expire the demo invitation: ${expireError.message}`);
  const revoked = await createOrganizationInvitation(admin.authUserId, orgId, {
    email: seedEmail("invite-revoked"),
    role: "supervisor",
    profile: { full_name: "Morgan Ellis", department: "Platform" },
  });
  await revokeOrganizationInvitation(admin.authUserId, orgId, revoked.invitation.id);
  console.log(`  pending ${pending.invitation.email}, expired ${expired.invitation.email}, revoked ${revoked.invitation.email}`);

  // ---------- Summary ----------
  const allProjectIds = [...projectIds.values()];
  const allTaskIds = [...taskIds.values()];
  const allEmployeeIds = [...employees.values()].map((employee) => employee.employeeId);
  const { data: linkedSkills } = await supabase.from("employee_skills").select("skill_id, skills (is_approved)").in("employee_id", allEmployeeIds);
  const linkedById = new Map((linkedSkills ?? []).map((link) => [link.skill_id as string, (link.skills as unknown as { is_approved: boolean } | null)?.is_approved ?? false]));
  const pendingSkills = [...linkedById.values()].filter((isApproved) => !isApproved).length;
  const approvedSkills = linkedById.size - pendingSkills;

  const counts: Array<[string, number]> = [
    ["organizations", 1],
    ["organization_members", await countRows("organization_members", "organization_id", [orgId])],
    ["supervisors (profiles)", await countRows("supervisors", "organization_id", [orgId])],
    ["employees", await countRows("employees", "organization_id", [orgId])],
    ["skills used (catalog)", approvedSkills],
    ["skills used (pending)", pendingSkills],
    ["employee_skills", await countRows("employee_skills", "employee_id", allEmployeeIds)],
    ["projects", await countRows("projects", "organization_id", [orgId])],
    ["project_documents", await countRows("project_documents", "project_id", allProjectIds)],
    ["project_document_analyses", await countRows("project_document_analyses", "project_id", allProjectIds)],
    ["ai_recommendations", await countRows("ai_recommendations", "project_id", allProjectIds)],
    ["tasks", await countRows("tasks", "project_id", allProjectIds)],
    ["task_progress", await countRows("task_progress", "task_id", allTaskIds)],
    ["organization_invitations", await countRows("organization_invitations", "organization_id", [orgId])],
    ["teams", await countRows("teams", "organization_id", [orgId])],
    ["team_members", await countRows("team_members", "employee_id", allEmployeeIds)],
    ["activity_logs", await countRows("activity_logs", "organization_id", [orgId])],
  ];

  console.log(`\n=== ${DEMO_ORG_NAME} is ready ===\n`);
  console.log("Rows created:");
  for (const [table, count] of counts) console.log(`  ${table.padEnd(28)} ${count}`);

  console.log("\nDemo logins (password: the SEED_DEMO_PASSWORD value in backend/.env):");
  console.log(`  organization admin   ${admin.email}`);
  for (const person of supervisors) console.log(`  supervisor           ${person.email}`);
  for (const person of employees.values()) console.log(`  employee             ${person.email}  (${person.name})`);

  console.log("\nScreens that now have data:");
  console.log("  [x] Manager dashboard            sign in as the admin or a supervisor");
  console.log("  [x] Employee dashboard           sign in as any employee (e.g. seed+aisha@example.test)");
  console.log("  [x] Platform admin skill queue   your platform admin account; pending: " + ([...PENDING_SKILLS].join(", ")));
  console.log("  [x] Project tabs                 Overview, Documents (3 analyzed specs), Recommendations (2 runs)");
  console.log("  [x] Tasks                        board with every status, overdue due dates, assigned and unassigned");
  console.log("  [x] Invitations                  1 pending, 1 expired, 1 revoked (org admin)");
  console.log("  [x] Team directory               9 employees in 3 teams (filter by team), plus 2 supervisors");

  console.log("\nNot seeded:");
  if (notSeeded.length === 0) console.log("  - nothing; every planned feature has data");
  for (const gap of notSeeded) console.log(`  - ${gap}`);
  console.log("");
}

main().catch((error: unknown) => {
  console.error(`\nSeed failed: ${error instanceof Error ? error.message : String(error)}`);
  console.error("Run `npm run seed:demo:clean -- --confirm` to remove any partial demo data.");
  process.exitCode = 1;
});

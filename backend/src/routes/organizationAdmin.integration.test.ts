/**
 * Organization-admin role and team management through the real app and a real (local, disposable)
 * database with 202610260001_member_roles_and_teams.sql applied. Auth is stubbed (tokens map to
 * fixture users); everything else, including role guards, organization context, the database
 * functions and the access rules that read roles, is the real app.
 *
 * Covers: 403 for non-admins, 404 across organizations, validation, every role transition and what
 * it changes on the very next request (messaging access, the employee pages, assignment and the
 * assignable lists), the last-admin rule, team create/rename/lead/add/move/remove/delete, removing
 * someone no longer assignable, tasks left with unassignable people, activity logs and the limiter.
 * The concurrency and all-or-nothing cases are in supabase/tests (they need two connections and a
 * failing statement inside the transaction).
 *
 * Run: npm run test:integration (SUPABASE_URL must point at a local disposable database).
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { requireDisposableDatabase } from "../testing/requireDisposableDatabase.js";

requireDisposableDatabase("organization admin integration tests");
Object.assign(process.env, { RATE_LIMIT_MAX: "5000", TRANSACTIONAL_EMAIL_PROVIDER: "console" });

const supabaseOrigin = new URL(process.env.SUPABASE_URL!).origin;
const realFetch = globalThis.fetch;
let serverOrigin = "";
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith(supabaseOrigin) || (serverOrigin && url.startsWith(serverOrigin))) return realFetch(input, init);
  throw new TypeError(`Network access is blocked in tests: ${url}`);
}) as typeof fetch;

const { supabase } = await import("../config/supabase.js");
const { default: app } = await import("../app.js");

// Fixtures ------------------------------------------------------------------------------------------
const suffix = crypto.randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
const createdOrganizationIds: string[] = [];
const tokens = new Map<string, string>();

async function insert<T>(table: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(row).select("*").single<T>();
  assert.equal(error, null, `${table}: ${error?.message}`);
  return data!;
}

interface Person {
  userId: string;
  token: string;
  name: string;
  membershipId: string;
  employeeId?: string;
  supervisorId?: string;
}

async function person(organizationId: string, label: string, role: "organization_admin" | "supervisor" | "employee", profile: "employee" | "supervisor" | null): Promise<Person> {
  const authUserId = crypto.randomUUID();
  const user = await insert<{ id: string }>("users", { auth_user_id: authUserId, email: `roles-${label}-${suffix}@example.test` });
  createdUserIds.push(user.id);
  const token = `token-${label}-${suffix}`;
  tokens.set(token, authUserId);
  const name = `${label} ${suffix}`;
  const membership = await insert<{ id: string }>("organization_members", { organization_id: organizationId, user_id: user.id, role, status: "active" });
  const result: Person = { userId: user.id, token, name, membershipId: membership.id };
  if (profile === "employee") {
    result.employeeId = (await insert<{ id: string }>("employees", { user_id: user.id, organization_id: organizationId, full_name: name, weekly_capacity_hours: 40 })).id;
  } else if (profile === "supervisor") {
    result.supervisorId = (await insert<{ id: string }>("supervisors", { user_id: user.id, organization_id: organizationId, full_name: name })).id;
  }
  return result;
}

let orgA = "";
let orgB = "";
let sam: Person; // org A admin who created the organization: no profile
let rita: Person; // org A admin with a supervisor profile
let nora: Person; // org A admin, used only for the limiter
let sup: Person; // org A supervisor, leads Platform
let aisha: Person; // org A employee with an open task
let ben: Person; // org A employee with only a completed task, in Platform
let lena: Person; // org A employee with no tasks
let olga: Person; // org B admin
let oscar: Person; // org B employee
let otherSupervisorId = ""; // org B supervisor profile
let project = "";
let aishaTask = "";
let unassignedTask = "";
let platform = "";
let mobile = "";
let otherTeam = "";
let projectChannel = "";

before(async () => {
  const founderA = crypto.randomUUID();
  const founderUser = await insert<{ id: string }>("users", { auth_user_id: founderA, email: `roles-founder-${suffix}@example.test` });
  createdUserIds.push(founderUser.id);
  orgA = (await insert<{ id: string }>("organizations", { name: `Roles A ${suffix}`, slug: `roles-a-${suffix}`, created_by_user_id: founderUser.id })).id;
  orgB = (await insert<{ id: string }>("organizations", { name: `Roles B ${suffix}`, slug: `roles-b-${suffix}`, created_by_user_id: founderUser.id })).id;
  createdOrganizationIds.push(orgA, orgB);

  sam = await person(orgA, "sam", "organization_admin", null);
  rita = await person(orgA, "rita", "organization_admin", "supervisor");
  nora = await person(orgA, "nora", "organization_admin", null);
  sup = await person(orgA, "sup", "supervisor", "supervisor");
  aisha = await person(orgA, "aisha", "employee", "employee");
  ben = await person(orgA, "ben", "employee", "employee");
  lena = await person(orgA, "lena", "employee", "employee");
  olga = await person(orgB, "olga", "organization_admin", null);
  oscar = await person(orgB, "oscar", "employee", "employee");
  otherSupervisorId = (await person(orgB, "supb", "supervisor", "supervisor")).supervisorId!;

  project = (await insert<{ id: string }>("projects", { title: `Scanner ${suffix}`, organization_id: orgA, created_by_user_id: sam.userId })).id;
  aishaTask = (await insert<{ id: string }>("tasks", { project_id: project, title: `Aisha open ${suffix}`, created_by_user_id: sam.userId, assigned_employee_id: aisha.employeeId, status: "in_progress", estimated_hours: 6 })).id;
  await insert("tasks", { project_id: project, title: `Ben done ${suffix}`, created_by_user_id: sam.userId, assigned_employee_id: ben.employeeId, status: "completed", estimated_hours: 4 });
  unassignedTask = (await insert<{ id: string }>("tasks", { project_id: project, title: `Unassigned ${suffix}`, created_by_user_id: sam.userId, status: "todo", estimated_hours: 3 })).id;

  platform = (await insert<{ id: string }>("teams", { organization_id: orgA, name: `Platform ${suffix}`, lead_supervisor_id: sup.supervisorId })).id;
  mobile = (await insert<{ id: string }>("teams", { organization_id: orgA, name: `Mobile ${suffix}` })).id;
  otherTeam = (await insert<{ id: string }>("teams", { organization_id: orgB, name: `Other ${suffix}` })).id;
  await insert("team_members", { team_id: platform, employee_id: ben.employeeId });

  projectChannel = (await supabase.from("conversations").select("id").eq("project_id", project).single<{ id: string }>()).data!.id;
});

(supabase.auth as unknown as { getUser: unknown }).getUser = async (token: string) => {
  const id = tokens.get(token);
  return id ? { data: { user: { id } }, error: null } : { data: { user: null }, error: { message: "invalid token" } };
};

let server: ReturnType<typeof app.listen>;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  serverOrigin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server?.close();
  globalThis.fetch = realFetch;
  if (createdOrganizationIds.length) await supabase.from("organizations").delete().in("id", createdOrganizationIds);
  if (createdUserIds.length) await supabase.from("users").delete().in("id", createdUserIds);
});

interface Reply<T = unknown> { status: number; body: { success?: boolean; message?: string; data?: T } }

async function call<T = unknown>(who: Person, method: string, path: string, options: { organizationId?: string | null; body?: unknown } = {}): Promise<Reply<T>> {
  const organizationId = options.organizationId === undefined ? orgA : options.organizationId;
  const response = await realFetch(`${serverOrigin}/api/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${who.token}`,
      "content-type": "application/json",
      ...(organizationId ? { "x-organization-id": organizationId } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: (await response.json()) as Reply<T>["body"] };
}

const setRole = (who: Person, target: Person, role: string, fullName?: string) =>
  call(who, "PATCH", `/organizations/${orgA}/members/${target.membershipId}/role`, { body: { role, ...(fullName ? { fullName } : {}) } });

const conversationIds = async (who: Person) =>
  ((await call<Array<{ id: string }>>(who, "GET", "/messaging/conversations")).body.data ?? []).map((conversation) => conversation.id);

const assignableIds = async () =>
  ((await call<Array<{ id: string }>>(sam, "GET", "/supervisors/employees")).body.data ?? []).map((employee) => employee.id);

async function roleLogs() {
  const { count } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgA)
    .eq("event_type", "member_role_changed");
  return count ?? 0;
}

// Guards ---------------------------------------------------------------------------------------------

describe("who may call", () => {
  test("supervisors and employees get 403 on every admin route", async () => {
    for (const who of [sup, aisha]) {
      assert.equal((await setRole(who, lena, "supervisor", "X")).status, 403);
      assert.equal((await call(who, "GET", `/organizations/${orgA}/members/${lena.membershipId}/role-change-preview?role=supervisor`)).status, 403);
      assert.equal((await call(who, "POST", `/organizations/${orgA}/teams`, { body: { name: "Nope" } })).status, 403);
      assert.equal((await call(who, "DELETE", `/organizations/${orgA}/teams/${mobile}`)).status, 403);
      assert.equal((await call(who, "GET", `/organizations/${orgA}/unassignable-open-tasks`)).status, 403);
    }
  });

  test("supervisors can still read teams", async () => {
    assert.equal((await call(sup, "GET", `/organizations/${orgA}/teams`)).status, 200);
  });

  test("the organization comes from the verified context", async () => {
    assert.equal((await call(sam, "PATCH", `/organizations/${orgA}/members/${lena.membershipId}/role`, { organizationId: null, body: { role: "employee" } })).status, 400);
    assert.equal((await call(sam, "PATCH", `/organizations/${orgA}/members/${lena.membershipId}/role`, { organizationId: orgB, body: { role: "employee" } })).status, 403);
    assert.equal((await call(olga, "PATCH", `/organizations/${orgB}/members/${lena.membershipId}/role`, { organizationId: orgB, body: { role: "supervisor", fullName: "X" } })).status, 404);
  });

  test("ids from another organization answer 404", async () => {
    assert.equal((await setRole(sam, oscar, "supervisor", "X")).status, 404);
    assert.equal((await call(sam, "GET", `/organizations/${orgA}/members/${oscar.membershipId}/role-change-preview?role=supervisor`)).status, 404);
    assert.equal((await call(sam, "PATCH", `/organizations/${orgA}/teams/${otherTeam}`, { body: { name: "Mine" } })).status, 404);
    assert.equal((await call(sam, "DELETE", `/organizations/${orgA}/teams/${otherTeam}`)).status, 404);
    assert.equal((await call(sam, "POST", `/organizations/${orgA}/teams/${mobile}/members`, { body: { employeeId: oscar.employeeId } })).status, 404);
    assert.equal((await call(sam, "POST", `/organizations/${orgA}/teams/${platform}/members/${ben.employeeId}/move`, { body: { toTeamId: otherTeam } })).status, 404);
  });

  test("validation", async () => {
    assert.equal((await setRole(sam, lena, "owner")).status, 400);
    assert.equal((await call(sam, "PATCH", `/organizations/${orgA}/members/not-a-uuid/role`, { body: { role: "employee" } })).status, 400);
    assert.equal((await setRole(sam, lena, "supervisor", "n".repeat(121))).status, 400);
    assert.equal((await call(sam, "GET", `/organizations/${orgA}/members/${lena.membershipId}/role-change-preview?role=boss`)).status, 400);
    assert.equal((await call(sam, "POST", `/organizations/${orgA}/teams`, { body: { name: "" } })).status, 400);
    assert.equal((await call(sam, "POST", `/organizations/${orgA}/teams`, { body: { name: "t".repeat(81) } })).status, 400);
    assert.equal((await call(sam, "PATCH", `/organizations/${orgA}/teams/${mobile}`, { body: {} })).status, 400);
    assert.equal((await call(sam, "POST", `/organizations/${orgA}/teams/${mobile}/members`, { body: { employeeId: "x" } })).status, 400);
  });
});

// Roles ----------------------------------------------------------------------------------------------

describe("role changes", () => {
  test("employee to supervisor and back: access changes on the next request, nothing is lost", async () => {
    const logsBefore = await roleLogs();
    assert.ok(!(await conversationIds(lena)).includes(projectChannel), "an employee without tasks has no project channel");
    assert.ok((await assignableIds()).includes(lena.employeeId!));

    const preview = await call<{ needsProfile: string; suggestedName: string; blockedReason: null }>(sam, "GET",
      `/organizations/${orgA}/members/${lena.membershipId}/role-change-preview?role=supervisor`);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.data!.needsProfile, "supervisor");
    assert.equal(preview.body.data!.suggestedName, lena.name);
    assert.equal(preview.body.data!.blockedReason, null);

    const promoted = await setRole(sam, lena, "supervisor", "Lena as Lead");
    assert.equal(promoted.status, 200, promoted.body.message);
    assert.equal((promoted.body.data as { role: string; supervisor_full_name: string }).role, "supervisor");
    assert.equal((promoted.body.data as { supervisor_full_name: string }).supervisor_full_name, "Lena as Lead");

    // Next request: supervisor access, no employee pages, not assignable.
    assert.ok((await conversationIds(lena)).includes(projectChannel), "a supervisor sees every project channel");
    assert.equal((await call(lena, "GET", "/employees/me")).status, 403);
    assert.equal((await call(lena, "GET", "/projects")).status, 200);
    assert.ok(!(await assignableIds()).includes(lena.employeeId!), "left the assignable list");
    const assign = await call(sam, "PATCH", `/tasks/${unassignedTask}/assign`, { body: { employeeId: lena.employeeId } });
    assert.equal(assign.status, 404, "a supervisor can't be assigned work");

    // And back: the employee profile was kept, so nothing needs a name.
    const demoted = await setRole(sam, lena, "employee");
    assert.equal(demoted.status, 200, demoted.body.message);
    assert.ok(!(await conversationIds(lena)).includes(projectChannel), "project channel gone again");
    assert.equal((await call(lena, "GET", "/employees/me")).status, 200);
    assert.ok((await assignableIds()).includes(lena.employeeId!), "assignable again");
    assert.equal((await call(sam, "PATCH", `/tasks/${unassignedTask}/assign`, { body: { employeeId: lena.employeeId } })).status, 200);
    await supabase.from("tasks").update({ assigned_employee_id: null, assigned_at: null }).eq("id", unassignedTask);

    assert.equal(await roleLogs(), logsBefore + 2);
    const { data: log } = await supabase.from("activity_logs").select("actor_user_id, metadata").eq("organization_id", orgA)
      .eq("event_type", "member_role_changed").eq("metadata->>to_role", "supervisor").eq("metadata->>membership_id", lena.membershipId).single();
    assert.equal(log!.actor_user_id, sam.userId);
    assert.deepEqual([log!.metadata.from_role, log!.metadata.target_user_id], ["employee", lena.userId]);
  });

  test("an employee with open tasks can't leave the role", async () => {
    const preview = await call<{ blockedReason: string; openTasks: number }>(sam, "GET",
      `/organizations/${orgA}/members/${aisha.membershipId}/role-change-preview?role=supervisor`);
    assert.deepEqual([preview.body.data!.blockedReason, preview.body.data!.openTasks], ["has_open_tasks", 1]);
    const refused = await setRole(sam, aisha, "supervisor", "X");
    assert.equal(refused.status, 409);
    assert.match(refused.body.message!, /1 open task/);
    assert.equal((await setRole(sam, aisha, "organization_admin")).status, 409);
  });

  test("a team lead can't become an employee until replaced", async () => {
    const refused = await setRole(sam, sup, "employee", "X");
    assert.equal(refused.status, 409);
    assert.match(refused.body.message!, /leads Platform/);
  });

  test("a missing profile needs a name, never taken from the email", async () => {
    const preview = await call<{ needsProfile: string; suggestedName: string | null }>(sam, "GET",
      `/organizations/${orgA}/members/${sam.membershipId}/role-change-preview?role=employee`);
    assert.deepEqual([preview.body.data!.needsProfile, preview.body.data!.suggestedName], ["employee", null]);
    const refused = await setRole(sam, sam, "employee");
    assert.equal(refused.status, 400);
    assert.match(refused.body.message!, /name/i);
  });

  test("the last active admin can't be demoted, by anyone", async () => {
    // nora (third admin) is kept out of this test: demote her first, then restore.
    assert.equal((await setRole(sam, nora, "supervisor", "Nora")).status, 200);
    assert.equal((await setRole(sam, rita, "supervisor")).status, 200, "rita has a supervisor profile, no name needed");
    const self = await setRole(sam, sam, "supervisor", "Sam");
    assert.equal(self.status, 409);
    assert.match(self.body.message!, /at least one active admin/);
    assert.equal((await call(rita, "GET", `/organizations/${orgA}/unassignable-open-tasks`)).status, 403, "rita is no longer an admin");
    assert.equal((await setRole(sam, rita, "organization_admin")).status, 200);
    assert.equal((await setRole(rita, sam, "supervisor", "Sam")).status, 200, "self or other: allowed while another admin remains");
    assert.equal((await setRole(rita, sam, "organization_admin")).status, 200);
    assert.equal((await setRole(sam, nora, "organization_admin")).status, 200);
  });

  test("invited and suspended members can't change roles", async () => {
    await supabase.from("organization_members").update({ status: "suspended" }).eq("id", lena.membershipId);
    assert.equal((await setRole(sam, lena, "supervisor", "X")).status, 409);
    await supabase.from("organization_members").update({ status: "active" }).eq("id", lena.membershipId);
  });
});

// Teams ----------------------------------------------------------------------------------------------

// Team writes are made by rita, so no admin goes over the 30-per-minute limit during the suite.
describe("teams", () => {
  const teams = async () =>
    (await call<Array<{ id: string; name: string; lead: { supervisor_id: string } | null; members: Array<{ employee_id: string; assignable: boolean }> }>>(
      sam, "GET", `/organizations/${orgA}/teams`)).body.data!;

  test("create, rename, set and clear the lead", async () => {
    const created = await call<{ id: string }>(rita, "POST", `/organizations/${orgA}/teams`, { body: { name: `Data ${suffix}` } });
    assert.equal(created.status, 201, created.body.message);
    const data = created.body.data!.id;
    assert.equal((await call(rita, "POST", `/organizations/${orgA}/teams`, { body: { name: `DATA ${suffix}` } })).status, 409);
    assert.equal((await call(rita, "PATCH", `/organizations/${orgA}/teams/${data}`, { body: { name: `Mobile ${suffix}` } })).status, 409);
    assert.equal((await call(rita, "PATCH", `/organizations/${orgA}/teams/${data}`, { body: { leadSupervisorId: otherSupervisorId } })).status, 409);
    assert.equal((await call(rita, "PATCH", `/organizations/${orgA}/teams/${data}`, { body: { leadSupervisorId: rita.supervisorId } })).status, 200,
      "an admin with a supervisor profile can lead");
    assert.equal((await call(rita, "PATCH", `/organizations/${orgA}/teams/${data}`, { body: { name: `Data Platform ${suffix}`, leadSupervisorId: null } })).status, 200);
    const team = (await teams()).find((entry) => entry.id === data)!;
    assert.deepEqual([team.name, team.lead], [`Data Platform ${suffix}`, null]);
    assert.equal((await call(rita, "DELETE", `/organizations/${orgA}/teams/${data}`)).status, 200);
    assert.ok(!(await teams()).some((entry) => entry.id === data));
  });

  test("add, move and remove members", async () => {
    assert.equal((await call(rita, "POST", `/organizations/${orgA}/teams/${mobile}/members`, { body: { employeeId: lena.employeeId } })).status, 201);
    assert.equal((await call(rita, "POST", `/organizations/${orgA}/teams/${mobile}/members`, { body: { employeeId: lena.employeeId } })).status, 409);
    const moved = await call(rita, "POST", `/organizations/${orgA}/teams/${mobile}/members/${lena.employeeId}/move`, { body: { toTeamId: platform } });
    assert.equal(moved.status, 200, moved.body.message);
    const afterMove = await teams();
    assert.ok(afterMove.find((team) => team.id === platform)!.members.some((member) => member.employee_id === lena.employeeId));
    assert.ok(!afterMove.find((team) => team.id === mobile)!.members.some((member) => member.employee_id === lena.employeeId), "moved, not copied");
    assert.equal((await call(rita, "POST", `/organizations/${orgA}/teams/${mobile}/members/${lena.employeeId}/move`, { body: { toTeamId: platform } })).status, 409);
    assert.equal((await call(rita, "DELETE", `/organizations/${orgA}/teams/${platform}/members/${lena.employeeId}`)).status, 200);
    assert.equal((await call(rita, "DELETE", `/organizations/${orgA}/teams/${platform}/members/${lena.employeeId}`)).status, 409);
  });

  test("someone no longer assignable stays listed and can be removed", async () => {
    assert.equal((await setRole(rita, ben, "supervisor", "Ben Lead")).status, 200, "ben has only completed work");
    const member = (await teams()).find((team) => team.id === platform)!.members.find((entry) => entry.employee_id === ben.employeeId);
    assert.equal(member?.assignable, false);
    assert.equal((await call(rita, "POST", `/organizations/${orgA}/teams/${platform}/members/${ben.employeeId}/move`, { body: { toTeamId: mobile } })).status, 404,
      "can't be moved into a team");
    const refused = await call(rita, "DELETE", `/organizations/${orgA}/teams/${platform}`);
    assert.equal(refused.status, 409);
    assert.match(refused.body.message!, /0 active and 1 inactive/);
    assert.equal((await call(rita, "DELETE", `/organizations/${orgA}/teams/${platform}/members/${ben.employeeId}`)).status, 200);
    assert.equal((await setRole(rita, ben, "employee")).status, 200);
  });
});

// Tasks left with people who can't be assigned ---------------------------------------------------------

describe("unassignable open tasks", () => {
  test("lists open work of someone suspended, for admins", async () => {
    let listed = await call<Array<{ taskId: string; employeeName: string; memberStatus: string }>>(sam, "GET", `/organizations/${orgA}/unassignable-open-tasks`);
    assert.deepEqual(listed.body.data, []);
    await supabase.from("organization_members").update({ status: "suspended" }).eq("id", aisha.membershipId);
    listed = await call<Array<{ taskId: string; employeeName: string; memberStatus: string }>>(sam, "GET", `/organizations/${orgA}/unassignable-open-tasks`);
    assert.deepEqual(listed.body.data!.map((task) => [task.taskId, task.memberStatus]), [[aishaTask, "suspended"]]);
    await supabase.from("organization_members").update({ status: "active" }).eq("id", aisha.membershipId);
  });
});

// Avatars (Phase 2) and the readers of assignable_employees ---------------------------------------------

describe("avatars and assignable readers after a role change", () => {
  const AVATAR = "p03-s4-c2-a1";

  test("avatars still appear on the team list, the member list and the role-change response", async () => {
    await supabase.from("users").update({ avatar_variant: AVATAR }).in("id", [sup.userId, ben.userId, lena.userId]);
    assert.equal((await call(rita, "POST", `/organizations/${orgA}/teams/${platform}/members`, { body: { employeeId: ben.employeeId } })).status, 201);

    type TeamRow = { id: string; lead: { avatarVariant: string | null } | null; members: Array<{ employee_id: string; avatarVariant: string | null; assignable: boolean }> };
    let platformTeam = (await call<TeamRow[]>(sam, "GET", `/organizations/${orgA}/teams`)).body.data!.find((team) => team.id === platform)!;
    assert.equal(platformTeam.lead?.avatarVariant, AVATAR, "lead avatar");
    assert.equal(platformTeam.members.find((member) => member.employee_id === ben.employeeId)?.avatarVariant, AVATAR, "member avatar");

    const membersList = (await call<Array<{ membership_id: string; avatarVariant: string | null }>>(sam, "GET", `/organizations/${orgA}/members`)).body.data!;
    assert.equal(membersList.find((entry) => entry.membership_id === lena.membershipId)?.avatarVariant, AVATAR, "member directory avatar");

    // Someone no longer assignable keeps their avatar in the team list.
    const changed = await setRole(rita, ben, "supervisor", "Ben Lead");
    assert.equal(changed.status, 200, changed.body.message);
    assert.equal((changed.body.data as { avatarVariant: string | null }).avatarVariant, AVATAR, "role-change response avatar");
    platformTeam = (await call<TeamRow[]>(sam, "GET", `/organizations/${orgA}/teams`)).body.data!.find((team) => team.id === platform)!;
    const benRow = platformTeam.members.find((member) => member.employee_id === ben.employeeId)!;
    assert.deepEqual([benRow.assignable, benRow.avatarVariant], [false, AVATAR]);
    assert.equal((await setRole(rita, ben, "employee")).status, 200);
    assert.equal((await call(rita, "DELETE", `/organizations/${orgA}/teams/${platform}/members/${ben.employeeId}`)).status, 200);
  });

  test("recommendations and the supervisor dashboard follow assignable_employees", async () => {
    const document = await insert<{ id: string }>("project_documents", {
      project_id: project, uploaded_by_user_id: sam.userId, storage_path: `test/${suffix}.pdf`,
      original_filename: "requirements.pdf", mime_type: "application/pdf", size_bytes: 1000,
    });
    await insert("project_document_analyses", { document_id: document.id, project_id: project, summary: "Scanner work", required_skills: ["Node.js"], estimated_hours: 20 });

    type Run = { recommendations: Array<{ employeeId: string; avatarVariant: string | null }> };
    const run = async () => {
      const reply = await call<Run>(sam, "POST", `/projects/${project}/recommendations`);
      assert.equal(reply.status, 201, reply.body.message);
      return reply.body.data!.recommendations;
    };
    const totalEmployees = async () =>
      (await call<{ employees: { total_employees: number } }>(sam, "GET", "/dashboard/supervisor")).body.data!.employees.total_employees;

    const before = await run();
    assert.ok(before.some((entry) => entry.employeeId === lena.employeeId), "lena is in the pool");
    assert.equal(before.find((entry) => entry.employeeId === lena.employeeId)?.avatarVariant, AVATAR, "recommendation avatar");
    const dashboardBefore = await totalEmployees();

    assert.equal((await setRole(rita, lena, "supervisor")).status, 200, "lena keeps her supervisor profile from earlier, no name needed");
    assert.ok(!(await run()).some((entry) => entry.employeeId === lena.employeeId), "lena left the recommendation pool");
    assert.equal(await totalEmployees(), dashboardBefore - 1, "and the dashboard workload");

    assert.equal((await setRole(rita, lena, "employee")).status, 200);
    assert.ok((await run()).some((entry) => entry.employeeId === lena.employeeId), "back in the pool");
    assert.equal(await totalEmployees(), dashboardBefore);
  });
});

// Limiter (last: it uses up nora's budget) --------------------------------------------------------------

describe("rate limit", () => {
  test("30 writes per minute per admin", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 31; attempt += 1) statuses.push((await setRole(nora, lena, "employee")).status);
    assert.deepEqual([statuses[0], statuses[29], statuses[30]], [200, 200, 429]);
    assert.equal((await setRole(sam, lena, "employee")).status, 200, "other admins are counted separately");
  });
});

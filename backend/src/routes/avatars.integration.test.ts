/**
 * Teammates' avatars through the real app and a real (local, disposable) database.
 *
 * Every avatar lookup goes through getAvatarVariants, which reads `users` with exactly
 * "id, avatar_variant". The suite records the ids of every such lookup per request and checks that
 * they are only people whose names that same response shows to that viewer, never anyone from
 * another organization, and never on a public route. Auth is stubbed (tokens map to fixture
 * users); everything else, including role guards and organization context, is the real app.
 *
 * Run: npm run test:integration (SUPABASE_URL must point at a local disposable database).
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";
import { requireDisposableDatabase } from "../testing/requireDisposableDatabase.js";

requireDisposableDatabase("avatar integration tests");
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

// Record every avatar lookup (the shared helper's query) ------------------------------------------
const lookups: string[] = [];
const realFrom = supabase.from.bind(supabase);
(supabase as unknown as { from: unknown }).from = (table: string) => {
  const builder = realFrom(table);
  if (table !== "users") return builder;
  const realSelect = builder.select.bind(builder);
  (builder as unknown as { select: unknown }).select = (columns?: string, ...rest: unknown[]) => {
    const query = (realSelect as (...args: unknown[]) => ReturnType<typeof realSelect>)(columns, ...rest);
    if (columns !== "id, avatar_variant") return query;
    const realIn = query.in.bind(query);
    (query as unknown as { in: unknown }).in = (column: string, values: string[]) => {
      lookups.push(...values);
      return realIn(column, values);
    };
    return query;
  };
  return builder;
};

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

interface Fixture { userId: string; token: string; name: string; avatar: string | null; employeeId?: string }

async function createUser(label: string, name: string, avatar: string | null): Promise<Fixture> {
  const authUserId = crypto.randomUUID();
  const user = await insert<{ id: string }>("users", { auth_user_id: authUserId, email: `av-${label}-${suffix}@example.test`, avatar_variant: avatar });
  createdUserIds.push(user.id);
  const token = `token-${label}-${suffix}`;
  tokens.set(token, authUserId);
  return { userId: user.id, token, name: `${name} ${suffix}`, avatar };
}

async function join(organizationId: string, person: Fixture, role: "organization_admin" | "supervisor" | "employee") {
  await insert("organization_members", { organization_id: organizationId, user_id: person.userId, role, status: "active" });
  if (role === "employee") {
    person.employeeId = (await insert<{ id: string }>("employees", { user_id: person.userId, organization_id: organizationId, full_name: person.name, weekly_capacity_hours: 40 })).id;
  } else {
    await insert("supervisors", { user_id: person.userId, organization_id: organizationId, full_name: person.name });
  }
}

let orgA = "";
let orgB = "";
let sam: Fixture; // org A admin
let aisha: Fixture; // org A employee with an avatar and a task in the project
let ben: Fixture; // org A employee without an avatar, with another task in the project
let lena: Fixture; // org A employee with an avatar and no project work
let olga: Fixture; // org B admin with an avatar
let projectA = "";
let aishaTask = "";
let benTask = "";
let projectChannel = "";
let generalA = "";

before(async () => {
  sam = await createUser("sam", "Sam Carter", "p12-s1-c3-a0");
  aisha = await createUser("aisha", "Aisha Bello", "p05-s3-c1-a1");
  ben = await createUser("ben", "Ben Okafor", null);
  lena = await createUser("lena", "Lena Ortiz", "p10-s2-c2-a0");
  olga = await createUser("olga", "Olga Berg", "p07-s6-c6-a0");

  orgA = (await insert<{ id: string }>("organizations", { name: `Avatars A ${suffix}`, slug: `avatars-a-${suffix}`, created_by_user_id: sam.userId })).id;
  orgB = (await insert<{ id: string }>("organizations", { name: `Avatars B ${suffix}`, slug: `avatars-b-${suffix}`, created_by_user_id: olga.userId })).id;
  createdOrganizationIds.push(orgA, orgB);
  await join(orgA, sam, "organization_admin");
  await join(orgA, aisha, "employee");
  await join(orgA, ben, "employee");
  await join(orgA, lena, "employee");
  await join(orgB, olga, "organization_admin");

  projectA = (await insert<{ id: string }>("projects", { title: `Scanner rollout ${suffix}`, organization_id: orgA, created_by_user_id: sam.userId })).id;
  aishaTask = (await insert<{ id: string }>("tasks", { project_id: projectA, title: `Aisha's task ${suffix}`, created_by_user_id: sam.userId, assigned_employee_id: aisha.employeeId, status: "in_progress", estimated_hours: 14 })).id;
  benTask = (await insert<{ id: string }>("tasks", { project_id: projectA, title: `Ben's secret task ${suffix}`, created_by_user_id: sam.userId, assigned_employee_id: ben.employeeId, status: "todo", estimated_hours: 8 })).id;

  projectChannel = (await supabase.from("conversations").select("id").eq("project_id", projectA).single<{ id: string }>()).data!.id;
  generalA = (await supabase.from("conversations").select("id").eq("organization_id", orgA).eq("kind", "general").single<{ id: string }>()).data!.id;
  await setUpPeopleLists();
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
  if (createdOrganizationIds.length) await realFrom("organizations").delete().in("id", createdOrganizationIds);
  if (createdUserIds.length) await realFrom("users").delete().in("id", createdUserIds);
});

beforeEach(() => {
  lookups.length = 0;
});

async function call(person: Fixture | null, method: string, path: string, options: { organizationId?: string; body?: unknown } = {}) {
  lookups.length = 0;
  const response = await realFetch(`${serverOrigin}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(person ? { Authorization: `Bearer ${person.token}` } : {}),
      ...(options.organizationId ? { "X-Organization-Id": options.organizationId } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const json = (await response.json()) as { data?: unknown };
  return { status: response.status, data: json.data, lookedUp: [...lookups] };
}

/** Every object in a response that carries `avatarVariant`. */
function avatarCarriers(value: unknown, found: Array<Record<string, unknown>> = []) {
  if (Array.isArray(value)) value.forEach((item) => avatarCarriers(item, found));
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("avatarVariant" in record) found.push(record);
    Object.values(record).forEach((item) => avatarCarriers(item, found));
  }
  return found;
}

const everyone = () => [sam, aisha, ben, lena, olga, nia, pat];
const byUserId = (userId: unknown) => everyone().find((person) => person.userId === userId);

/**
 * The rules for one response: each avatar sits on an object that also shows that person's name,
 * matches their stored avatar, and every id the request looked up is one of those shown people.
 */
function assertAvatarsBesideNames(result: { data: unknown; lookedUp: string[] }, label: string, idKey = "userId") {
  const carriers = avatarCarriers(result.data);
  const shown = new Set<string>();
  for (const carrier of carriers) {
    const id = String(carrier[idKey] ?? carrier.user_id ?? "");
    const person = byUserId(id);
    assert.ok(person, `${label}: avatar on an unknown or missing person ${JSON.stringify(carrier)}`);
    const name = carrier.name ?? carrier.full_name ?? carrier.fullName;
    assert.ok(typeof name === "string" && name.length > 0, `${label}: avatar without a visible name`);
    assert.equal(carrier.avatarVariant, person.avatar, `${label}: ${person.name}`);
    shown.add(id);
  }
  for (const id of result.lookedUp) {
    assert.ok(shown.has(id), `${label}: looked up an avatar for ${byUserId(id)?.name ?? id}, who isn't shown by name`);
  }
  assert.ok(!result.lookedUp.includes(olga.userId) || carriers.some((carrier) => carrier.userId === olga.userId), `${label}: org B leak`);
  return carriers;
}

// Messaging -----------------------------------------------------------------------------------------
describe("messaging", () => {
  test("members, the mention list and DM peers carry avatars beside names; never anyone from another organization", async () => {
    const members = await call(aisha, "GET", "/messaging/members", { organizationId: orgA });
    assert.equal(members.status, 200);
    const carriers = assertAvatarsBesideNames(members, "members");
    // Nia has no profile, so messaging shows her by her email's local part: that is her visible name here.
    assert.deepEqual(new Set(carriers.map((carrier) => carrier.userId)), new Set([sam, aisha, ben, lena, nia].map((person) => person.userId)));
    assert.ok(!members.lookedUp.includes(olga.userId));

    const channelMembers = await call(sam, "GET", `/messaging/conversations/${projectChannel}/members`, { organizationId: orgA });
    assert.equal(channelMembers.status, 200);
    assertAvatarsBesideNames(channelMembers, "channel members");

    const opened = await call(sam, "POST", "/messaging/conversations/direct", { organizationId: orgA, body: { userId: aisha.userId } });
    assert.ok([200, 201].includes(opened.status), JSON.stringify(opened.data));
    assert.deepEqual((opened.data as { directPeer: unknown }).directPeer, { userId: aisha.userId, name: aisha.name, avatarVariant: aisha.avatar });
    assertAvatarsBesideNames(opened, "open DM");

    const conversations = await call(sam, "GET", "/messaging/conversations", { organizationId: orgA });
    const list = conversations.data as Array<{ kind: string; directPeer: Record<string, unknown> | null }>;
    assert.ok(list.filter((row) => row.kind !== "direct").every((row) => row.directPeer === null));
    assertAvatarsBesideNames(conversations, "conversation list");
    assert.deepEqual(conversations.lookedUp, [aisha.userId], "only the DM peer is looked up");
  });

  test("senders carry avatars; mentions and task chips don't; a restricted chip carries nothing", async () => {
    const tagMine = await call(sam, "POST", `/messaging/conversations/${projectChannel}/messages`, {
      organizationId: orgA,
      body: { body: `<@${ben.userId}> please pair with Aisha`, taskId: aishaTask, clientId: crypto.randomUUID() },
    });
    assert.equal(tagMine.status, 201, JSON.stringify(tagMine.data));
    const tagBens = await call(sam, "POST", `/messaging/conversations/${projectChannel}/messages`, {
      organizationId: orgA,
      body: { body: "Status on this one?", taskId: benTask, clientId: crypto.randomUUID() },
    });
    assert.equal(tagBens.status, 201, JSON.stringify(tagBens.data));

    // Aisha (employee) sees the project channel because she has a task in it.
    const page = await call(aisha, "GET", `/messaging/conversations/${projectChannel}/messages`, { organizationId: orgA });
    assert.equal(page.status, 200, JSON.stringify(page.data));
    const messages = (page.data as { messages: Array<Record<string, any>> }).messages;
    const mine = messages.find((message) => message.task?.accessible === true)!;
    const restricted = messages.find((message) => message.task?.accessible === false)!;

    assert.deepEqual(mine.sender, { userId: sam.userId, name: sam.name, avatarVariant: sam.avatar });
    assert.deepEqual(mine.mentions, [{ userId: ben.userId, name: ben.name }], "mentions carry no avatar");
    assert.equal("avatarVariant" in mine.task.assignee, false, "accessible chip assignee carries no avatar");
    assert.deepEqual(restricted.task, { accessible: false }, "restricted chip has no task data and no person");
    assert.deepEqual(page.lookedUp, [sam.userId], "only the sender is looked up");
    assertAvatarsBesideNames(page, "messages (employee)");

    // The poll path hydrates the same way.
    const changes = await call(aisha, "GET", `/messaging/conversations/${projectChannel}/messages?updatedSince=${encodeURIComponent(new Date(0).toISOString())}`, { organizationId: orgA });
    assert.equal(changes.status, 200);
    assertAvatarsBesideNames(changes, "message poll");
  });

  test("an empty poll looks nothing up", async () => {
    const changes = await call(sam, "GET", `/messaging/conversations/${generalA}/messages?updatedSince=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString())}`, { organizationId: orgA });
    assert.equal(changes.status, 200);
    assert.deepEqual(changes.lookedUp, []);
  });

  test("another organization can't reach these people or their avatars", async () => {
    const members = await call(olga, "GET", "/messaging/members", { organizationId: orgB });
    assert.deepEqual(avatarCarriers(members.data).map((carrier) => carrier.userId), [olga.userId]);
    assert.deepEqual(members.lookedUp, [olga.userId]);
    const foreign = await call(olga, "GET", `/messaging/conversations/${projectChannel}/members`, { organizationId: orgB });
    assert.equal(foreign.status, 404);
    assert.deepEqual(foreign.lookedUp, []);
    const wrongOrg = await call(olga, "GET", "/messaging/members", { organizationId: orgA });
    assert.equal(wrongOrg.status, 403);
    assert.deepEqual(wrongOrg.lookedUp, []);
  });
});

// Directory-style lists -----------------------------------------------------------------------------
let nia: Fixture; // org A member with an avatar but no profile: lists show her email, not a name
let pat: Fixture; // platform admin with no organization
let teamId = "";

/** Called at the end of the main fixture hook, so organization A exists first. */
async function setUpPeopleLists() {
  nia = await createUser("nia", "Nia Email-only", "p02-s3-c3-a3");
  await insert("organization_members", { organization_id: orgA, user_id: nia.userId, role: "employee", status: "active" });
  pat = await createUser("pat", "Pat Platform", "p09-s5-c4-a0");
  await realFrom("users").update({ platform_role: "platform_admin" }).eq("id", pat.userId);

  const lead = (await supabase.from("supervisors").select("id").eq("user_id", sam.userId).eq("organization_id", orgA).single<{ id: string }>()).data!;
  teamId = (await insert<{ id: string }>("teams", { organization_id: orgA, name: `Scanner team ${suffix}`, lead_supervisor_id: lead.id })).id;
  await insert("team_members", { team_id: teamId, employee_id: aisha.employeeId });
  await insert("team_members", { team_id: teamId, employee_id: ben.employeeId });

  const document = await insert<{ id: string }>("project_documents", {
    project_id: projectA, uploaded_by_user_id: sam.userId, storage_path: `test/${suffix}.pdf`, original_filename: "requirements.pdf",
    mime_type: "application/pdf", size_bytes: 1024, extraction_status: "extracted",
  });
  await insert("project_document_analyses", {
    document_id: document.id, project_id: projectA, required_skills: ["Node.js"], preferred_skills: ["Offline sync"], estimated_hours: 56, summary: "Scanner rollout",
  });
}

describe("people lists for managers", () => {
  test("assignable employees carry avatars, looked up for exactly the employees listed", async () => {
    const result = await call(sam, "GET", "/supervisors/employees", { organizationId: orgA });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const rows = result.data as Array<{ id: string; full_name: string; avatarVariant: string | null }>;
    for (const person of [aisha, ben, lena]) {
      const row = rows.find((entry) => entry.id === person.employeeId);
      assert.ok(row?.full_name, person.name);
      assert.equal(row.avatarVariant, person.avatar, person.name);
    }
    assert.deepEqual(new Set(result.lookedUp), new Set([aisha.userId, ben.userId, lena.userId]));
  });

  test("organization members: avatars beside profile names; email-only members stay initials and aren't looked up", async () => {
    const result = await call(sam, "GET", `/organizations/${orgA}/members`, { organizationId: orgA });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const rows = result.data as Array<{ user_id: string; employee_full_name: string | null; supervisor_full_name: string | null; avatarVariant: string | null }>;
    assert.equal(rows.length, 5);
    for (const row of rows) {
      const person = byUserId(row.user_id)!;
      const named = Boolean(row.employee_full_name || row.supervisor_full_name);
      assert.equal(row.avatarVariant, named ? person.avatar : null, person.name);
    }
    assert.equal(rows.find((row) => row.user_id === nia.userId)?.avatarVariant, null);
    assert.deepEqual(new Set(result.lookedUp), new Set([sam.userId, aisha.userId, ben.userId, lena.userId]));
  });

  test("teams: the lead and members carry avatars", async () => {
    const result = await call(sam, "GET", `/organizations/${orgA}/teams`, { organizationId: orgA });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const team = (result.data as Array<{ id: string; lead: { avatarVariant: string | null }; members: Array<{ avatarVariant: string | null }> }>).find((entry) => entry.id === teamId)!;
    assert.equal(team.lead.avatarVariant, sam.avatar);
    assert.deepEqual(team.members.map((member) => member.avatarVariant).sort(), [aisha.avatar, ben.avatar].sort());
    assert.deepEqual(new Set(result.lookedUp), new Set([sam.userId, aisha.userId, ben.userId]));
  });

  test("recommendations carry avatars, and a changed avatar shows on the next load without regenerating", async () => {
    const generated = await call(sam, "POST", `/projects/${projectA}/recommendations`, { organizationId: orgA });
    assert.ok([200, 201].includes(generated.status), JSON.stringify(generated.data));
    const run = generated.data as { recommendationRunId: string; recommendations: Array<{ employeeId: string; avatarVariant: string | null }> };
    for (const person of [aisha, ben, lena]) {
      assert.equal(run.recommendations.find((entry) => entry.employeeId === person.employeeId)?.avatarVariant, person.avatar, person.name);
    }

    await realFrom("users").update({ avatar_variant: "p11-s6-c5-a2" }).eq("id", aisha.userId);
    try {
      const latest = await call(sam, "GET", `/projects/${projectA}/recommendations`, { organizationId: orgA });
      assert.equal(latest.status, 200, JSON.stringify(latest.data));
      const again = latest.data as typeof run;
      assert.equal(again.recommendationRunId, run.recommendationRunId, "same run, not regenerated");
      assert.equal(again.recommendations.find((entry) => entry.employeeId === aisha.employeeId)?.avatarVariant, "p11-s6-c5-a2");
      const { data: stored } = await realFrom("ai_recommendations").select("score_breakdown, summary").eq("recommendation_run_id", run.recommendationRunId);
      assert.ok(!JSON.stringify(stored).includes("avatar"), "avatars are never stored with the run");
    } finally {
      await realFrom("users").update({ avatar_variant: aisha.avatar }).eq("id", aisha.userId);
    }
  });

  test("platform user directory: avatars for named entries on the page only", async () => {
    const result = await call(pat, "GET", `/admin/users/directory?organizationId=${orgA}`);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const items = (result.data as { items: Array<{ user_id: string; full_name: string | null; avatarVariant: string | null }> }).items;
    assert.equal(items.length, 5);
    for (const item of items) {
      const person = byUserId(item.user_id)!;
      assert.equal(item.avatarVariant, item.full_name ? person.avatar : null, person.name);
    }
    assert.equal(items.find((item) => item.user_id === nia.userId)?.avatarVariant, null);
    assert.ok(!result.lookedUp.includes(nia.userId));
    assert.ok(result.lookedUp.every((id) => items.some((item) => item.user_id === id && item.full_name)));
  });
});

describe("an employee", () => {
  test("sees avatars only beside names she can already see, and can't reach the managers' lists", async () => {
    const allowed = [
      "/messaging/members",
      "/messaging/conversations",
      `/messaging/conversations/${projectChannel}/members`,
      `/messaging/conversations/${projectChannel}/messages`,
      "/tasks",
      "/employees/me",
      "/employees/me/tasks",
      "/dashboard/employee",
    ];
    for (const path of allowed) {
      const result = await call(aisha, "GET", path, { organizationId: orgA });
      assert.equal(result.status, 200, `${path}: ${JSON.stringify(result.data)}`);
      assertAvatarsBesideNames(result, `employee ${path}`);
    }
    const forbidden = [
      "/supervisors/employees",
      `/organizations/${orgA}/members`,
      `/organizations/${orgA}/teams`,
      `/projects/${projectA}/recommendations`,
      "/admin/users/directory",
      "/dashboard/supervisor",
    ];
    for (const path of forbidden) {
      const result = await call(aisha, "GET", path, { organizationId: orgA });
      assert.equal(result.status, 403, path);
      assert.deepEqual(result.lookedUp, [], `${path}: nothing looked up before the role check`);
    }
  });
});

describe("public routes", () => {
  test("never carry or look up an avatar, signed in or not", async () => {
    const token = `public-${suffix}-${crypto.randomUUID()}`;
    await insert("organization_invitations", {
      organization_id: orgA, email: `invitee-${suffix}@example.test`, role: "employee", invited_by_user_id: sam.userId,
      token_hash: crypto.createHash("sha256").update(token).digest("hex"),
    });
    const routes: Array<[string, string, unknown?]> = [
      ["GET", "/public/skills"],
      ["GET", "/public/skills/categories"],
      ["GET", `/invitations/${token}`],
      ["GET", `/invitations/not-a-real-token-${suffix}`],
      ["POST", `/invitations/not-a-real-token-${suffix}/register`, { password: "Correct-Horse-9" }],
      ["POST", `/invitations/not-a-real-token-${suffix}/accept`, {}],
      ["GET", "/health"],
    ];
    for (const viewer of [null, sam]) {
      for (const [method, path, body] of routes) {
        const result = await call(viewer, method, path, { body });
        // /health may be 503 locally (no storage service); it still must not carry avatars.
        assert.ok(result.status < 500 || path === "/health", `${path}: ${result.status} ${JSON.stringify(result.data)}`);
        assert.equal(JSON.stringify(result.data ?? null).includes("avatarVariant"), false, `${path} carries avatarVariant`);
        assert.deepEqual(result.lookedUp, [], `${path} looked up avatars`);
      }
    }
  });
});

/**
 * Integration tests for messaging. They create and delete their own organizations, users,
 * projects and tasks, so they refuse to run against a remote database unless
 * MESSAGING_TESTS_ALLOW_REMOTE=true. Run with: npm run test:messaging
 * (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY pointing at a disposable database with the
 * migrations applied).
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";

const supabaseHost = new URL(process.env.SUPABASE_URL ?? "http://invalid").hostname;
if (!["127.0.0.1", "localhost"].includes(supabaseHost) && process.env.MESSAGING_TESTS_ALLOW_REMOTE !== "true") {
  throw new Error(
    `Refusing to run messaging integration tests against ${supabaseHost}. Point SUPABASE_URL at a disposable ` +
      "database, or set MESSAGING_TESTS_ALLOW_REMOTE=true if you really mean it."
  );
}

const { supabase } = await import("../config/supabase.js");
const messaging = await import("./messagingService.js");
const { assignTask } = await import("./taskService.js");
const { AppError } = await import("../utils/appError.js");
type MessagingActor = import("../types/messaging.js").MessagingActor;
type Role = MessagingActor["role"];

const suffix = crypto.randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
const authUserIds = new Map<string, string>();
const createdOrganizationIds: string[] = [];

async function insert<T>(table: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(row).select("*").single<T>();
  assert.equal(error, null, `${table}: ${error?.message}`);
  assert.ok(data);
  return data;
}

async function createUser(label: string) {
  const authUserId = crypto.randomUUID();
  const user = await insert<{ id: string }>("users", {
    auth_user_id: authUserId,
    email: `msg-${label}-${suffix}@example.test`,
  });
  createdUserIds.push(user.id);
  authUserIds.set(user.id, authUserId);
  return user.id;
}

async function createOrganization(label: string, ownerId: string) {
  const organization = await insert<{ id: string }>("organizations", {
    name: `Messaging ${label} ${suffix}`,
    slug: `messaging-${label}-${suffix}`,
    created_by_user_id: ownerId,
  });
  createdOrganizationIds.push(organization.id);
  return organization.id;
}

async function addMember(organizationId: string, userId: string, role: Role, status = "active") {
  await insert("organization_members", { organization_id: organizationId, user_id: userId, role, status });
  return {
    userId,
    organizationId,
    role,
    memberSince: new Date(Date.now() - 60 * 60_000).toISOString(),
  } satisfies MessagingActor;
}

async function expectStatus(promise: Promise<unknown>, status: number, label: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AppError, `${label}: expected AppError, got ${String(error)}`);
    assert.equal(error.statusCode, status, `${label}: ${error.message}`);
    return true;
  });
}

async function projectChannelId(projectId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .single<{ id: string }>();
  assert.equal(error, null, error?.message);
  return data!.id;
}

const pause = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));

async function generalChannelId(organizationId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("kind", "general")
    .single<{ id: string }>();
  assert.equal(error, null, error?.message);
  return data!.id;
}

// Org A: admin, supervisor, two employees (one assigned a task), a suspended member.
// Org B: one admin, used to probe cross-organization access.
let admin: MessagingActor;
let supervisor: MessagingActor;
let assignee: MessagingActor;
let otherEmployee: MessagingActor;
let suspendedUserId: string;
let outsider: MessagingActor;
let orgA: string;
let orgB: string;
let projectA: string;
let projectChannelA: string;
let generalA: string;
let assignedTask: string;
let unassignedTask: string;
const assignedTaskTitle = `Secret task title ${suffix}`;

before(async () => {
  const adminId = await createUser("admin");
  orgA = await createOrganization("a", adminId);
  admin = await addMember(orgA, adminId, "organization_admin");
  supervisor = await addMember(orgA, await createUser("supervisor"), "supervisor");
  assignee = await addMember(orgA, await createUser("assignee"), "employee");
  otherEmployee = await addMember(orgA, await createUser("employee"), "employee");
  suspendedUserId = await createUser("suspended");
  await addMember(orgA, suspendedUserId, "employee", "suspended");

  const outsiderId = await createUser("outsider");
  orgB = await createOrganization("b", outsiderId);
  outsider = await addMember(orgB, outsiderId, "organization_admin");

  const assigneeEmployee = await insert<{ id: string }>("employees", {
    user_id: assignee.userId,
    organization_id: orgA,
    full_name: `Asha Assignee ${suffix}`,
  });
  await insert("employees", { user_id: otherEmployee.userId, organization_id: orgA, full_name: `Omar Other ${suffix}` });

  projectA = (await insert<{ id: string }>("projects", {
    title: `Project A ${suffix}`,
    organization_id: orgA,
    created_by_user_id: admin.userId,
  })).id;

  assignedTask = (await insert<{ id: string }>("tasks", {
    project_id: projectA,
    title: assignedTaskTitle,
    created_by_user_id: admin.userId,
    assigned_employee_id: assigneeEmployee.id,
    status: "in_progress",
  })).id;
  await insert("task_progress", { task_id: assignedTask, employee_id: assigneeEmployee.id, progress_percentage: 40 });

  unassignedTask = (await insert<{ id: string }>("tasks", {
    project_id: projectA,
    title: `Unassigned ${suffix}`,
    created_by_user_id: admin.userId,
  })).id;

  generalA = await generalChannelId(orgA);
  const { data: projectChannel } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", projectA)
    .single<{ id: string }>();
  projectChannelA = projectChannel!.id;
});

after(async () => {
  // Same order as the demo cleanup script: organizations first (cascades all messaging rows),
  // then users. Messages they sent elsewhere keep a null sender.
  if (createdOrganizationIds.length) {
    const { error } = await supabase.from("organizations").delete().in("id", createdOrganizationIds);
    assert.equal(error, null, error?.message);
  }
  if (createdUserIds.length) {
    const { error } = await supabase.from("users").delete().in("id", createdUserIds);
    assert.equal(error, null, error?.message);
  }
});

describe("channel creation", () => {
  test("a new organization gets one General channel and a new project gets one channel", async () => {
    const { count: generalCount } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgA)
      .eq("kind", "general");
    assert.equal(generalCount, 1);
    assert.ok(projectChannelA);
  });
});

describe("conversation visibility", () => {
  test("admins and supervisors see General and project channels; employees with no tasks see only General", async () => {
    for (const actor of [admin, supervisor]) {
      const ids = (await messaging.listConversations(actor)).map((conversation) => conversation.id);
      assert.ok(ids.includes(generalA) && ids.includes(projectChannelA));
    }
    const employeeIds = (await messaging.listConversations(otherEmployee)).map((conversation) => conversation.id);
    assert.deepEqual(employeeIds, [generalA]);
    await expectStatus(messaging.listMessages(otherEmployee, projectChannelA), 404, "employee project channel");
  });

  test("another organization's members never see this organization's conversations", async () => {
    const ids = (await messaging.listConversations(outsider)).map((conversation) => conversation.id);
    assert.ok(!ids.includes(generalA) && !ids.includes(projectChannelA));
  });

  test("every endpoint answers 404 for another organization's conversation", async () => {
    const message = await messaging.sendMessage(admin, generalA, { body: "Only for org A" });
    const cases: Array<[string, () => Promise<unknown>]> = [
      ["list messages", () => messaging.listMessages(outsider, generalA)],
      ["poll changes", () => messaging.listMessageChanges(outsider, generalA, new Date(0).toISOString())],
      ["send", () => messaging.sendMessage(outsider, generalA, { body: "hi" })],
      ["edit", () => messaging.editMessage(outsider, generalA, message.id, "hijack")],
      ["delete", () => messaging.deleteMessage(outsider, generalA, message.id)],
      ["add reaction", () => messaging.addReaction(outsider, generalA, message.id, "👍")],
      ["remove reaction", () => messaging.removeReaction(outsider, generalA, message.id, "👍")],
      ["mark read", () => messaging.markConversationRead(outsider, generalA)],
      ["conversation members", () => messaging.listConversationMembers(outsider, generalA)],
      ["project channel members", () => messaging.listConversationMembers(outsider, projectChannelA)],
      ["project channel messages", () => messaging.listMessages(outsider, projectChannelA)],
      ["open DM with a member of another org", () => messaging.getOrCreateDirectConversation(outsider, admin.userId)],
      ["ask for update on another org's task", () => messaging.requestTaskProgress(outsider, assignedTask)],
    ];
    for (const [label, call] of cases) await expectStatus(call(), 404, label);

    const summary = await messaging.getUnreadSummary(outsider);
    assert.ok(!summary.conversations.some((conversation) => conversation.id === generalA));
  });
});

describe("direct messages", () => {
  test("are unique per pair whichever member starts them", async () => {
    const first = await messaging.getOrCreateDirectConversation(admin, supervisor.userId);
    const second = await messaging.getOrCreateDirectConversation(supervisor, admin.userId);
    assert.equal(first.id, second.id);
    assert.equal(first.created, true);
    assert.equal(second.created, false);

    const { count } = await supabase
      .from("conversation_participants")
      .select("user_id", { count: "exact", head: true })
      .eq("conversation_id", first.id);
    assert.equal(count, 2);
  });

  test("can't be started with yourself, a suspended member or someone outside the organization", async () => {
    await expectStatus(messaging.getOrCreateDirectConversation(admin, admin.userId), 400, "self");
    await expectStatus(messaging.getOrCreateDirectConversation(admin, suspendedUserId), 404, "suspended");
    await expectStatus(messaging.getOrCreateDirectConversation(admin, outsider.userId), 404, "other org");
  });

  test("are invisible to everyone else in the organization, admins included", async () => {
    const direct = await messaging.getOrCreateDirectConversation(supervisor, otherEmployee.userId);
    await messaging.sendMessage(supervisor, direct.id, { body: "Private note" });
    await expectStatus(messaging.listMessages(admin, direct.id), 404, "admin reading a DM");
    assert.ok(!(await messaging.listConversations(admin)).some((conversation) => conversation.id === direct.id));
  });
});

describe("task tagging", () => {
  test("only someone who can access a task can tag it", async () => {
    await expectStatus(
      messaging.sendMessage(otherEmployee, generalA, { body: "Look", taskId: assignedTask }),
      404,
      "employee tagging another person's task"
    );
  });

  test("viewers who can't access the task get a chip with no task data", async () => {
    const sent = await messaging.sendMessage(admin, generalA, { body: "Status?", taskId: assignedTask });

    const forAdmin = (await messaging.listMessages(admin, generalA)).messages.find((message) => message.id === sent.id);
    assert.deepEqual(forAdmin?.task, {
      accessible: true,
      taskId: assignedTask,
      title: assignedTaskTitle,
      status: "in_progress",
      progressPercent: 40,
      assignee: { userId: assignee.userId, name: `Asha Assignee ${suffix}` },
    });

    const forAssignee = (await messaging.listMessages(assignee, generalA)).messages.find((message) => message.id === sent.id);
    assert.equal(forAssignee?.task?.accessible, true);

    const forOther = (await messaging.listMessages(otherEmployee, generalA)).messages.find((message) => message.id === sent.id);
    assert.deepEqual(forOther?.task, { accessible: false });
    const serialized = JSON.stringify(forOther);
    for (const leaked of [assignedTaskTitle, assignedTask, "in_progress", "progressPercent", "Asha"]) {
      assert.ok(!serialized.includes(leaked), `restricted chip leaked ${leaked}`);
    }
  });
});

describe("messages", () => {
  test("are paged newest first with a cursor, without gaps or repeats", async () => {
    const direct = await messaging.getOrCreateDirectConversation(admin, assignee.userId);
    const sent: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      sent.push((await messaging.sendMessage(admin, direct.id, { body: `Message ${index}` })).id);
    }

    const seen: string[] = [];
    let cursor: string | null | undefined;
    do {
      const page = await messaging.listMessages(admin, direct.id, { cursor: cursor ?? undefined, limit: 2 });
      seen.push(...page.messages.map((message) => message.id));
      cursor = page.nextCursor;
    } while (cursor);

    assert.deepEqual(seen.filter((id) => sent.includes(id)), [...sent].reverse());
  });

  test("a retried send with the same clientId posts once", async () => {
    const clientId = crypto.randomUUID();
    const first = await messaging.sendMessage(admin, generalA, { body: "Once", clientId });
    const retry = await messaging.sendMessage(admin, generalA, { body: "Once", clientId });
    assert.equal(first.id, retry.id);
    assert.equal(first.clientId, clientId);
  });

  test("text is stored and returned as plain text, and blank or oversized text is rejected", async () => {
    const markup = '<img src=x onerror="alert(1)"> <b>bold</b>';
    const sent = await messaging.sendMessage(admin, generalA, { body: markup });
    assert.equal(sent.body, markup);
    await expectStatus(messaging.sendMessage(admin, generalA, { body: "   \n " }), 400, "blank");
    await expectStatus(messaging.sendMessage(admin, generalA, { body: "x".repeat(4001) }), 400, "too long");
  });

  test("mentions must point at people who can see the conversation", async () => {
    await expectStatus(
      messaging.sendMessage(admin, projectChannelA, { body: `<@${otherEmployee.userId}> please look` }),
      400,
      "mentioning an employee in a project channel"
    );
    const ok = await messaging.sendMessage(admin, projectChannelA, { body: `<@${supervisor.userId}> please look` });
    assert.deepEqual(ok.mentions.map((mention) => mention.userId), [supervisor.userId]);
  });

  test("only the sender can edit or delete, and deleting removes the text everywhere", async () => {
    const sent = await messaging.sendMessage(admin, generalA, { body: `Delete me <@${supervisor.userId}>` });
    await messaging.addReaction(supervisor, generalA, sent.id, "👍");

    await expectStatus(messaging.editMessage(supervisor, generalA, sent.id, "not yours"), 403, "edit other's");
    await expectStatus(messaging.deleteMessage(supervisor, generalA, sent.id), 403, "delete other's");

    const edited = await messaging.editMessage(admin, generalA, sent.id, "Edited text");
    assert.equal(edited.body, "Edited text");
    assert.ok(edited.editedAt);
    assert.deepEqual(edited.mentions, []);

    const deleted = await messaging.deleteMessage(admin, generalA, sent.id);
    assert.equal(deleted.body, "");
    assert.ok(deleted.deletedAt);
    assert.deepEqual(deleted.reactions, []);

    const { data: row } = await supabase.from("messages").select("body").eq("id", sent.id).single<{ body: string }>();
    assert.equal(row?.body, "", "the database row must not keep the text");

    const listed = (await messaging.listMessages(supervisor, generalA)).messages.find((message) => message.id === sent.id);
    assert.equal(listed?.body, "");

    await expectStatus(messaging.editMessage(admin, generalA, sent.id, "revive"), 409, "edit deleted");
    await expectStatus(messaging.addReaction(supervisor, generalA, sent.id, "🎉"), 409, "react to deleted");
  });
});

describe("reactions", () => {
  test("add, de-duplicate, count and remove; only curated emoji", async () => {
    const sent = await messaging.sendMessage(admin, generalA, { body: "React to me" });
    await messaging.addReaction(supervisor, generalA, sent.id, "🎉");
    await messaging.addReaction(supervisor, generalA, sent.id, "🎉");
    const withBoth = await messaging.addReaction(admin, generalA, sent.id, "🎉");
    assert.deepEqual(withBoth.reactions, [{ emoji: "🎉", count: 2, reactedByMe: true }]);

    const removed = await messaging.removeReaction(admin, generalA, sent.id, "🎉");
    assert.deepEqual(removed.reactions, [{ emoji: "🎉", count: 1, reactedByMe: false }]);

    await expectStatus(messaging.addReaction(admin, generalA, sent.id, "<script>"), 400, "not an emoji");
  });

  test("show up in the next poll", async () => {
    const sent = await messaging.sendMessage(admin, generalA, { body: "Poll me" });
    const baseline = await messaging.listMessageChanges(supervisor, generalA, sent.updatedAt);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await messaging.addReaction(supervisor, generalA, sent.id, "✅");
    const changes = await messaging.listMessageChanges(supervisor, generalA, baseline.syncedAt);
    const polled = changes.messages.find((message) => message.id === sent.id);
    assert.deepEqual(polled?.reactions, [{ emoji: "✅", count: 1, reactedByMe: true }]);
  });
});

describe("unread counts", () => {
  test("count others' messages after the read marker, and mentions separately", async () => {
    await messaging.markConversationRead(otherEmployee, generalA);
    await new Promise((resolve) => setTimeout(resolve, 20));

    await messaging.sendMessage(admin, generalA, { body: "One" });
    await messaging.sendMessage(admin, generalA, { body: `Two for <@${otherEmployee.userId}>` });
    await messaging.sendMessage(otherEmployee, generalA, { body: "My own message doesn't count" });

    const unread = (await messaging.getUnreadSummary(otherEmployee)).conversations.find((item) => item.id === generalA);
    assert.deepEqual(unread, { id: generalA, unreadCount: 2, unreadMentions: 1 });

    await messaging.markConversationRead(otherEmployee, generalA);
    const after = await messaging.getUnreadSummary(otherEmployee);
    assert.equal(after.conversations.find((item) => item.id === generalA)?.unreadCount ?? 0, 0);
  });

  test("the read marker never moves backwards", async () => {
    const first = await messaging.sendMessage(admin, generalA, { body: "Older" });
    const latest = await messaging.markConversationRead(supervisor, generalA);
    const again = await messaging.markConversationRead(supervisor, generalA, first.id);
    assert.equal(again.lastReadAt, latest.lastReadAt);
  });
});

describe("ask for update", () => {
  test("posts a tagged progress request in the DM with the assignee and logs it", async () => {
    const result = await messaging.requestTaskProgress(admin, assignedTask);
    const direct = await messaging.getOrCreateDirectConversation(assignee, admin.userId);

    assert.equal(result.conversationId, direct.id);
    assert.equal(result.recipient.userId, assignee.userId);
    assert.equal(result.message.kind, "progress_request");
    assert.deepEqual(result.message.mentions.map((mention) => mention.userId), [assignee.userId]);
    assert.equal(result.message.task?.accessible, true);

    const unread = (await messaging.getUnreadSummary(assignee)).conversations.find((item) => item.id === direct.id);
    assert.ok((unread?.unreadMentions ?? 0) >= 1, "the assignee is notified through an unread mention");

    const { count } = await supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgA)
      .eq("event_type", "task_progress_requested")
      .eq("task_id", assignedTask);
    assert.equal(count, 1);

    const { data: task } = await supabase.from("tasks").select("status").eq("id", assignedTask).single<{ status: string }>();
    assert.equal(task?.status, "in_progress", "asking for an update must not change the task");
  });

  test("is refused for unassigned tasks, your own task, and tasks you can't access", async () => {
    await expectStatus(messaging.requestTaskProgress(admin, unassignedTask), 409, "unassigned");
    await expectStatus(messaging.requestTaskProgress(assignee, assignedTask), 409, "own task");
    await expectStatus(messaging.requestTaskProgress(otherEmployee, assignedTask), 404, "no access");
  });
});

// Employees in project channels. A separate project fixture, so the tests above are unaffected:
// Project P (created by the supervisor) with Ella and Ben assigned, Project Q with only Ben, and
// Nia, an employee with no tasks at all.
describe("employees in project channels", () => {
  let ella: MessagingActor;
  let ben: MessagingActor;
  let nia: MessagingActor;
  let ellaEmployeeId: string;
  let projectP: string;
  let projectQ: string;
  let channelP: string;
  let channelQ: string;
  let ellaTask: string;
  let benTaskP: string;
  let earlyMessageId: string;
  const ellaName = `Ella Employee ${suffix}`;
  const benName = `Ben Builder ${suffix}`;
  const benTaskTitle = `Ben private task ${suffix}`;

  async function employee(label: string, name: string) {
    const actor = await addMember(orgA, await createUser(label), "employee");
    const row = await insert<{ id: string }>("employees", { user_id: actor.userId, organization_id: orgA, full_name: name });
    return { actor, employeeId: row.id };
  }

  async function task(projectId: string, title: string, employeeId: string) {
    return (await insert<{ id: string }>("tasks", {
      project_id: projectId,
      title,
      created_by_user_id: admin.userId,
      assigned_employee_id: employeeId,
      assigned_at: new Date().toISOString(),
      status: "in_progress",
    })).id;
  }

  const ids = (conversations: Array<{ id: string }>) => conversations.map((conversation) => conversation.id);

  before(async () => {
    const ellaSetup = await employee("ella", ellaName);
    const benSetup = await employee("ben", benName);
    ella = ellaSetup.actor;
    ellaEmployeeId = ellaSetup.employeeId;
    ben = benSetup.actor;
    nia = (await employee("nia", `Nia No Tasks ${suffix}`)).actor;

    projectP = (await insert<{ id: string }>("projects", {
      title: `Project P ${suffix}`,
      organization_id: orgA,
      created_by_user_id: supervisor.userId,
    })).id;
    projectQ = (await insert<{ id: string }>("projects", {
      title: `Project Q ${suffix}`,
      organization_id: orgA,
      created_by_user_id: admin.userId,
    })).id;
    channelP = await projectChannelId(projectP);
    channelQ = await projectChannelId(projectQ);

    // Posted before anyone was assigned: employees must never see it.
    earlyMessageId = (await messaging.sendMessage(admin, channelP, { body: "Before anyone was assigned" })).id;
    await pause();

    ellaTask = await task(projectP, `Ella task ${suffix}`, ellaEmployeeId);
    benTaskP = await task(projectP, benTaskTitle, benSetup.employeeId);
    await task(projectQ, `Ben Q task ${suffix}`, benSetup.employeeId);
  });

  test("the channel appears only for employees on the project, with the project title and nothing else", async () => {
    const forElla = await messaging.listConversations(ella);
    assert.ok(ids(forElla).includes(channelP));
    assert.ok(!ids(forElla).includes(channelQ));

    const summary = forElla.find((conversation) => conversation.id === channelP)!;
    assert.deepEqual(Object.keys(summary).sort(), [
      "directPeer", "id", "kind", "lastMessageAt", "lastMessagePreview", "projectId", "readOnly",
      "title", "unreadCount", "unreadMentions",
    ]);
    assert.equal(summary.title, `Project P ${suffix}`);
    assert.equal(summary.kind, "project");
    assert.equal(summary.readOnly, false);

    assert.deepEqual(ids(await messaging.listConversations(nia)), [generalA], "no project channels: only General");
  });

  test("history starts at the employee's earliest current assignment", async () => {
    const before = (await messaging.listConversations(ella)).find((conversation) => conversation.id === channelP)!;
    assert.equal(before.lastMessagePreview, null, "no preview of a message from before access");
    assert.equal(before.lastMessageAt, null);
    assert.equal(before.unreadCount, 0);

    const page = await messaging.listMessages(ella, channelP);
    assert.ok(!page.messages.some((message) => message.id === earlyMessageId));
    const changes = await messaging.listMessageChanges(ella, channelP, new Date(0).toISOString());
    assert.ok(!changes.messages.some((message) => message.id === earlyMessageId));

    await expectStatus(messaging.addReaction(ella, channelP, earlyMessageId, "👍"), 404, "react before cutoff");
    await expectStatus(messaging.markConversationRead(ella, channelP, earlyMessageId), 404, "read marker before cutoff");

    assert.ok((await messaging.listMessages(admin, channelP)).messages.some((message) => message.id === earlyMessageId),
      "admins keep the full history");

    const later = await messaging.sendMessage(admin, channelP, { body: "Welcome to the project" });
    assert.ok((await messaging.listMessages(ella, channelP)).messages.some((message) => message.id === later.id));
    const unread = (await messaging.getUnreadSummary(ella)).conversations.find((item) => item.id === channelP);
    assert.equal(unread?.unreadCount, 1);
  });

  test("an employee on the project can post, and gets 404 for a project they are not on", async () => {
    const sent = await messaging.sendMessage(ella, channelP, { body: "Hello team" });
    assert.equal(sent.sender?.name, ellaName);

    const cases: Array<[string, () => Promise<unknown>]> = [
      ["list messages", () => messaging.listMessages(ella, channelQ)],
      ["poll changes", () => messaging.listMessageChanges(ella, channelQ, new Date(0).toISOString())],
      ["send", () => messaging.sendMessage(ella, channelQ, { body: "hi" })],
      ["mark read", () => messaging.markConversationRead(ella, channelQ)],
      ["members", () => messaging.listConversationMembers(ella, channelQ)],
      ["original project channel", () => messaging.listMessages(ella, projectChannelA)],
    ];
    for (const [label, call] of cases) await expectStatus(call(), 404, label);
  });

  test("mention autocomplete lists only people who can open the channel, without emails", async () => {
    const members = await messaging.listConversationMembers(ella, channelP);
    const memberIds = members.map((member) => member.userId).sort();
    assert.deepEqual(memberIds, [admin.userId, supervisor.userId, ella.userId, ben.userId].sort());

    for (const member of members) {
      assert.deepEqual(Object.keys(member).sort(), ["avatarVariant", "isProjectCreator", "name", "role", "userId"]);
    }
    assert.ok(!JSON.stringify(members).includes("@"), "no email addresses");
    assert.equal(members.find((member) => member.userId === supervisor.userId)?.isProjectCreator, true);
    assert.equal(members.filter((member) => member.isProjectCreator).length, 1);
  });

  test("mentioning someone without access is rejected with a clear error; others count as mentions", async () => {
    await assert.rejects(
      messaging.sendMessage(ella, channelP, { body: `<@${nia.userId}> can you help?` }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /Nia No Tasks .* can't see this conversation/);
        return true;
      }
    );
    await expectStatus(
      messaging.sendMessage(ella, channelP, { body: `<@${otherEmployee.userId}> hi` }),
      400,
      "employee from another project"
    );

    await messaging.markConversationRead(ben, channelP);
    await pause();
    await messaging.sendMessage(ella, channelP, { body: `<@${ben.userId}> are you blocked?` });
    const unread = (await messaging.getUnreadSummary(ben)).conversations.find((item) => item.id === channelP);
    assert.equal(unread?.unreadMentions, 1);
  });

  test("employees tag only their own tasks, and only tasks from this project", async () => {
    const tagged = await messaging.sendMessage(ella, channelP, { body: "Question about my task", taskId: ellaTask });
    assert.equal(tagged.task?.accessible, true);

    await expectStatus(
      messaging.sendMessage(ella, channelP, { body: "Ben's task?", taskId: benTaskP }),
      404,
      "employee tagging a colleague's task"
    );
    await expectStatus(
      messaging.sendMessage(admin, channelP, { body: "Wrong project", taskId: assignedTask }),
      400,
      "admin tagging a task from another project"
    );

    const adminTag = await messaging.sendMessage(admin, channelP, { body: "Ben, status?", taskId: benTaskP });
    assert.equal(adminTag.task?.accessible, true);

    const forElla = (await messaging.listMessages(ella, channelP)).messages.find((message) => message.id === adminTag.id);
    assert.deepEqual(forElla?.task, { accessible: false });
    const serialized = JSON.stringify(forElla);
    for (const leaked of [benTaskTitle, benTaskP, "in_progress", "progressPercent"]) {
      assert.ok(!serialized.includes(leaked), `restricted chip leaked ${leaked}`);
    }

    const forBen = (await messaging.listMessages(ben, channelP)).messages.find((message) => message.id === tagged.id);
    assert.deepEqual(forBen?.task, { accessible: false }, "a colleague sees Ella's task as restricted");
  });

  test("access disappears between two polls when the last task is unassigned", async () => {
    const benMessage = await messaging.sendMessage(ben, channelP, { body: "My last update here" });
    const firstPoll = await messaging.listMessageChanges(ben, channelP, new Date(0).toISOString());
    assert.ok(firstPoll.messages.length > 0);
    assert.ok((await messaging.getUnreadSummary(ben)).conversations.some((item) => item.id === channelP) ||
      ids(await messaging.listConversations(ben)).includes(channelP));

    // Unassign Ben's only task in project P (Ben keeps his task in Q).
    const { error } = await supabase.from("tasks").update({ assigned_employee_id: null, assigned_at: null }).eq("id", benTaskP);
    assert.equal(error, null, error?.message);

    const cases: Array<[string, () => Promise<unknown>]> = [
      ["next poll", () => messaging.listMessageChanges(ben, channelP, firstPoll.syncedAt)],
      ["read", () => messaging.listMessages(ben, channelP)],
      ["send", () => messaging.sendMessage(ben, channelP, { body: "Still here?" })],
      ["react", () => messaging.addReaction(ben, channelP, benMessage.id, "👍")],
      ["mark read", () => messaging.markConversationRead(ben, channelP)],
      ["members", () => messaging.listConversationMembers(ben, channelP)],
    ];
    for (const [label, call] of cases) await expectStatus(call(), 404, label);

    assert.ok(!ids(await messaging.listConversations(ben)).includes(channelP), "gone from the list");
    assert.ok(ids(await messaging.listConversations(ben)).includes(channelQ), "other projects unaffected");
    assert.ok(!(await messaging.getUnreadSummary(ben)).conversations.some((item) => item.id === channelP),
      "no unread or mention counts for a channel he left");

    await expectStatus(
      messaging.sendMessage(admin, channelP, { body: `<@${ben.userId}> are you there?` }),
      400,
      "mentioning someone who lost access"
    );
    assert.ok(!(await messaging.listConversationMembers(admin, channelP)).some((member) => member.userId === ben.userId));

    const kept = (await messaging.listMessages(admin, channelP)).messages.find((message) => message.id === benMessage.id);
    assert.equal(kept?.sender?.name, benName, "his old messages stay, with his name");
  });

  test("re-saving the same assignee keeps assigned_at, so the employee keeps their history", async () => {
    const { data: beforeRow } = await supabase.from("tasks").select("assigned_at").eq("id", ellaTask).single<{ assigned_at: string }>();
    const visibleBefore = (await messaging.listMessages(ella, channelP)).messages.map((message) => message.id);

    await pause();
    await assignTask(authUserIds.get(admin.userId)!, orgA, ellaTask, ellaEmployeeId);

    const { data: afterRow } = await supabase.from("tasks").select("assigned_at").eq("id", ellaTask).single<{ assigned_at: string }>();
    assert.equal(afterRow?.assigned_at, beforeRow?.assigned_at);
    assert.deepEqual((await messaging.listMessages(ella, channelP)).messages.map((message) => message.id), visibleBefore);
  });

  test("a deleted project's channel disappears for employees and is read-only for admins", async () => {
    const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", projectQ);
    assert.equal(error, null, error?.message);

    assert.ok(!ids(await messaging.listConversations(ben)).includes(channelQ));
    await expectStatus(messaging.listMessages(ben, channelQ), 404, "employee reading a deleted project's channel");

    await messaging.listMessages(admin, channelQ);
    await expectStatus(messaging.sendMessage(admin, channelQ, { body: "Anyone?" }), 409, "admin posting in a deleted project");
  });

  test("another organization still gets 404 for project channels, and admins still can't read employee DMs", async () => {
    await expectStatus(messaging.listMessages(outsider, channelP), 404, "outsider reading");
    await expectStatus(messaging.listConversationMembers(outsider, channelP), 404, "outsider members");

    const direct = await messaging.getOrCreateDirectConversation(ella, otherEmployee.userId);
    await messaging.sendMessage(ella, direct.id, { body: "Just between us" });
    await expectStatus(messaging.listMessages(admin, direct.id), 404, "admin reading an employee DM");
    await expectStatus(messaging.listMessages(supervisor, direct.id), 404, "supervisor reading an employee DM");
  });
});

// Reassignment: the access date must not move forward while an employee keeps any live task in
// the project, and a new assignee can read earlier messages that tag their task (and only those).
describe("reassignment and project-channel history", () => {
  let ana: MessagingActor;
  let bo: MessagingActor;
  let cleo: MessagingActor;
  let dan: MessagingActor;
  const employeeIds = new Map<string, string>();
  let projectR: string;
  let channelR: string;
  let anaFirstTask: string;
  let anaSecondTask: string;
  let kickoffId: string;
  let reviewTaskId: string;
  let aboutReviewId: string;

  async function employee(label: string, name: string) {
    const actor = await addMember(orgA, await createUser(label), "employee");
    const row = await insert<{ id: string }>("employees", { user_id: actor.userId, organization_id: orgA, full_name: name });
    employeeIds.set(actor.userId, row.id);
    return actor;
  }

  async function task(title: string, assignee: MessagingActor | null) {
    return (await insert<{ id: string }>("tasks", {
      project_id: projectR,
      title,
      created_by_user_id: admin.userId,
      assigned_employee_id: assignee ? employeeIds.get(assignee.userId) : null,
      assigned_at: assignee ? new Date().toISOString() : null,
      status: "in_progress",
    })).id;
  }

  const reassign = (taskId: string, to: MessagingActor | null) =>
    assignTask(authUserIds.get(admin.userId)!, orgA, taskId, to ? employeeIds.get(to.userId) : undefined);

  const say = (body: string, taskId?: string) => messaging.sendMessage(admin, channelR, { body, taskId });

  async function visibleTo(actor: MessagingActor) {
    return (await messaging.listMessages(actor, channelR, { limit: 50 })).messages;
  }

  async function accessSince(actor: MessagingActor) {
    const { data, error } = await supabase
      .from("messaging_project_access")
      .select("access_since")
      .eq("employee_id", employeeIds.get(actor.userId)!)
      .eq("project_id", projectR)
      .maybeSingle<{ access_since: string }>();
    assert.equal(error, null, error?.message);
    return data?.access_since ? new Date(data.access_since).toISOString() : null;
  }

  before(async () => {
    ana = await employee("ana", `Ana Analyst ${suffix}`);
    bo = await employee("bo", `Bo Builder ${suffix}`);
    cleo = await employee("cleo", `Cleo Coder ${suffix}`);
    dan = await employee("dan", `Dan Developer ${suffix}`);
    projectR = (await insert<{ id: string }>("projects", {
      title: `Project R ${suffix}`,
      organization_id: orgA,
      created_by_user_id: admin.userId,
    })).id;
    channelR = await projectChannelId(projectR);
  });

  test("partial reassignment: losing one of two tasks keeps the access date and the history", async () => {
    anaFirstTask = await task(`Ana first ${suffix}`, ana);
    const firstDate = await accessSince(ana);
    assert.ok(firstDate, "the first assignment creates the access row");
    await pause();
    kickoffId = (await say("Kickoff notes for everyone")).id;
    await pause();
    anaSecondTask = await task(`Ana second ${suffix}`, ana);

    await reassign(anaFirstTask, bo);

    assert.equal(await accessSince(ana), firstDate, "the date must not move forward");
    assert.ok((await visibleTo(ana)).some((message) => message.id === kickoffId),
      "Ana still reads what she could read before");
    assert.ok(!(await visibleTo(bo)).some((message) => message.id === kickoffId),
      "Bo joined later and does not see older untagged history");
  });

  test("reassignment mid-conversation: the new assignee reads only the messages tagging their task", async () => {
    const reviewTask = await task(`Ana review task ${suffix}`, ana);
    await pause();
    const anaOwn = await messaging.sendMessage(ana, channelR, { body: "My notes on the review", taskId: reviewTask });
    const aboutTask = await say("Ana, the review estimate looks off", reviewTask);
    reviewTaskId = reviewTask;
    aboutReviewId = aboutTask.id;
    const plain = await say("Unrelated planning note");
    const aboutBosTask = await say("Bo, how is yours going?", anaFirstTask);
    await pause();

    await reassign(reviewTask, cleo);
    await pause();
    const welcome = await say("Welcome, Cleo");

    const forCleo = await visibleTo(cleo);
    const ids = forCleo.map((message) => message.id);
    assert.ok(ids.includes(aboutTask.id) && ids.includes(anaOwn.id), "messages tagging her task are visible");
    for (const hidden of [plain.id, aboutBosTask.id, kickoffId]) assert.ok(!ids.includes(hidden), "other earlier messages stay hidden");
    assert.ok(ids.includes(welcome.id));

    const earlier = forCleo.find((message) => message.id === aboutTask.id)!;
    assert.equal(earlier.shownForTask, true);
    assert.equal(earlier.body, "Ana, the review estimate looks off", "returned whole, including its text");
    assert.equal(earlier.task?.accessible, true, "she is the assignee now, so the chip is full");
    assert.equal(forCleo.find((message) => message.id === welcome.id)?.shownForTask, false);

    // Polling and paging agree with the page above.
    const polled = (await messaging.listMessageChanges(cleo, channelR, new Date(0).toISOString())).messages.map((m) => m.id);
    assert.ok(polled.includes(aboutTask.id) && !polled.includes(plain.id));
    const paged: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await messaging.listMessages(cleo, channelR, { cursor: cursor ?? undefined, limit: 1 });
      paged.push(...page.messages.map((message) => message.id));
      cursor = page.nextCursor;
    } while (cursor);
    assert.deepEqual([...paged].sort(), [...ids].sort(), "cursor paging returns exactly the visible set");

    // Earlier tagged messages are history, not unread; she can react to them.
    const unread = (await messaging.getUnreadSummary(cleo)).conversations.find((item) => item.id === channelR);
    assert.equal(unread?.unreadCount, 1, "only the message after she joined is unread");
    const reacted = await messaging.addReaction(cleo, channelR, aboutTask.id, "👍");
    assert.equal(reacted.shownForTask, true);
    await expectStatus(messaging.addReaction(cleo, channelR, plain.id, "👍"), 404, "react to a hidden earlier message");

    // Ana keeps the channel through her other task; the moved task is now restricted for her.
    const forAna = await visibleTo(ana);
    const anaView = forAna.find((message) => message.id === anaOwn.id)!;
    assert.equal(anaView.body, "My notes on the review", "her own text stays visible");
    assert.deepEqual(anaView.task, { accessible: false });
    assert.equal(anaView.shownForTask, false);
    assert.ok(!JSON.stringify(anaView).includes(`Ana review task ${suffix}`), "no task title leaks");
    assert.ok(forAna.some((message) => message.id === plain.id), "her history is unchanged");
  });

  test("losing then regaining access starts a new date; only tags of the regained task show from the gap", async () => {
    const danTask = await task(`Dan task ${suffix}`, dan);
    await pause();
    const firstPeriod = await say("Message during Dan's first period");
    await reassign(danTask, null);
    await expectStatus(messaging.listMessages(dan, channelR), 404, "no access between assignments");
    assert.equal(await accessSince(dan), null, "the access row is removed with his last task");

    const gapTag = await say("Who will pick up Dan's old task?", danTask);
    const gapPlain = await say("Chatter while Dan was away");
    await pause();
    await reassign(danTask, dan);

    const regainedAt = await accessSince(dan);
    assert.ok(regainedAt && Date.parse(regainedAt) > Date.parse(gapPlain.createdAt), "a new, later date");

    const ids = (await visibleTo(dan)).map((message) => message.id);
    assert.ok(ids.includes(gapTag.id), "the gap message tagging his task is visible");
    assert.ok(!ids.includes(gapPlain.id) && !ids.includes(firstPeriod.id), "the rest of the gap and his first period are not");
  });

  test("earlier tagged messages disappear again when the task moves on", async () => {
    await task(`Cleo second ${suffix}`, cleo);
    assert.ok((await visibleTo(cleo)).some((message) => message.id === aboutReviewId));

    await reassign(reviewTaskId, bo);
    assert.ok(!(await visibleTo(cleo)).some((message) => message.id === aboutReviewId),
      "no longer her task, so no longer visible");
    await expectStatus(messaging.addReaction(cleo, channelR, aboutReviewId, "🎉"), 404, "react after the task moved on");
  });
});

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
const { AppError } = await import("../utils/appError.js");
type MessagingActor = import("../types/messaging.js").MessagingActor;
type Role = MessagingActor["role"];

const suffix = crypto.randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
const createdOrganizationIds: string[] = [];

async function insert<T>(table: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(row).select("*").single<T>();
  assert.equal(error, null, `${table}: ${error?.message}`);
  assert.ok(data);
  return data;
}

async function createUser(label: string) {
  const user = await insert<{ id: string }>("users", {
    auth_user_id: crypto.randomUUID(),
    email: `msg-${label}-${suffix}@example.test`,
  });
  createdUserIds.push(user.id);
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
  test("admins and supervisors see General and project channels; employees see only General", async () => {
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

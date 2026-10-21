import crypto from "node:crypto";
import { supabase } from "../config/supabase.js";
import type {
  ConversationKind,
  ConversationSummary,
  MessageChanges,
  MessageKind,
  MessagePage,
  MessageView,
  MessagingActor,
  MessagingMember,
  MessagingPerson,
  ProgressRequestResult,
  SendMessageInput,
  TaskChip,
  UnreadSummary,
} from "../types/messaging.js";
import type { OrganizationMembershipRole } from "../types/organization.js";
import type { TaskStatus } from "../types/task.js";
import { AppError } from "../utils/appError.js";
import { isAllowedEmoji } from "../utils/emoji.js";
import { logger } from "../utils/logger.js";
import {
  decodeMessageCursor,
  directConversationKey,
  encodeMessageCursor,
  mentionToken,
  normalizeMessageBody,
  parseMentionUserIds,
} from "../utils/messageText.js";
import { logActivity } from "./activityLogService.js";

/*
 * Tenant isolation lives here. The backend uses the service-role client, which bypasses RLS, so
 * every query filters by actor.organizationId (verified by resolveOrganizationContext) and every
 * read or write first loads the conversation through loadConversation(), which applies the
 * access rules below. Conversations the caller may not see answer 404, never 403.
 *
 * Access rules:
 *   general  - every active organization member
 *   project  - active organization_admin and supervisor members; read-only once the project is deleted
 *   direct   - only its two participants; read-only once the other member is no longer active
 */

const PAGE_SIZE_DEFAULT = 30;
const PAGE_SIZE_MAX = 50;
const CHANGES_LIMIT = 200;
/** Polls look back this far past the client's cursor, so a write that commits late is not missed. */
const CHANGES_OVERLAP_MS = 10_000;
const PREVIEW_LENGTH = 140;
const PROGRESS_REQUEST_TEXT = "could you share a progress update on this task?";
const CHANNEL_ROLES: readonly OrganizationMembershipRole[] = ["organization_admin", "supervisor"];

const MESSAGE_COLUMNS =
  "id, conversation_id, organization_id, sender_user_id, kind, body, client_id, created_at, edited_at, deleted_at, updated_at";

interface ConversationRow {
  id: string;
  organization_id: string;
  kind: ConversationKind;
  project_id: string | null;
  direct_key: string | null;
  last_message_at: string | null;
  projects: { title: string; deleted_at: string | null } | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  organization_id: string;
  sender_user_id: string | null;
  kind: MessageKind;
  body: string;
  client_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  updated_at: string;
}

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  assigned_employee_id: string | null;
}

interface AccessibleConversation {
  row: ConversationRow;
  readOnly: boolean;
}

const CONVERSATION_SELECT =
  "id, organization_id, kind, project_id, direct_key, last_message_at, projects ( title, deleted_at )";

function fail(operation: string, error: { code?: string; message?: string } | null, message: string): never {
  logger.error("messaging_query_failed", { operation, code: error?.code, error: error?.message });
  throw new AppError(message, 500, true, { cause: error });
}

function notFound(): never {
  throw new AppError("Conversation not found.", 404);
}

function directPeerId(row: Pick<ConversationRow, "direct_key">, actorUserId: string) {
  const ids = row.direct_key?.split(":") ?? [];
  return ids.find((id) => id !== actorUserId) ?? actorUserId;
}

/** The pure access rule, before checking whether the project or peer is still active. */
export function canSeeConversation(
  actor: Pick<MessagingActor, "userId" | "role">,
  conversation: Pick<ConversationRow, "kind" | "direct_key">
) {
  switch (conversation.kind) {
    case "general":
      return true;
    case "project":
      return CHANNEL_ROLES.includes(actor.role);
    case "direct":
      return conversation.direct_key?.split(":").includes(actor.userId) ?? false;
  }
}

// People ------------------------------------------------------------------------------------------

async function activeMembers(organizationId: string, userIds?: string[]) {
  let query = supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (userIds) {
    if (userIds.length === 0) return new Map<string, OrganizationMembershipRole>();
    query = query.in("user_id", userIds);
  }

  const { data, error } = await query.returns<Array<{ user_id: string; role: OrganizationMembershipRole }>>();
  if (error) fail("active_members", error, "Unable to load organization members.");
  return new Map(data.map((member) => [member.user_id, member.role]));
}

/** Display names: the org-scoped employee or supervisor profile name, else the email's local part. */
async function resolvePeople(organizationId: string, userIds: Iterable<string>) {
  const ids = [...new Set(userIds)];
  const names = new Map<string, string>();
  if (ids.length === 0) return names;

  const [employees, supervisors, users] = await Promise.all([
    supabase.from("employees").select("user_id, full_name").eq("organization_id", organizationId).in("user_id", ids),
    supabase.from("supervisors").select("user_id, full_name").eq("organization_id", organizationId).in("user_id", ids),
    supabase.from("users").select("id, email").in("id", ids),
  ]);

  if (employees.error) fail("resolve_people_employees", employees.error, "Unable to load member names.");
  if (supervisors.error) fail("resolve_people_supervisors", supervisors.error, "Unable to load member names.");
  if (users.error) fail("resolve_people_users", users.error, "Unable to load member names.");

  for (const user of users.data) {
    const local = (user.email ?? "").split("@")[0];
    if (local) names.set(user.id, local);
  }
  for (const supervisor of supervisors.data) if (supervisor.full_name) names.set(supervisor.user_id, supervisor.full_name);
  for (const employee of employees.data) if (employee.full_name) names.set(employee.user_id, employee.full_name);

  return names;
}

function person(names: Map<string, string>, userId: string): MessagingPerson {
  return { userId, name: names.get(userId) ?? "Deleted user" };
}

export async function listMembers(actor: MessagingActor): Promise<MessagingMember[]> {
  const members = await activeMembers(actor.organizationId);
  const names = await resolvePeople(actor.organizationId, members.keys());

  return [...members]
    .map(([userId, role]) => ({ ...person(names, userId), role }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

// Conversations -----------------------------------------------------------------------------------

async function loadConversation(
  actor: MessagingActor,
  conversationId: string,
  options: { forWrite?: boolean } = {}
): Promise<AccessibleConversation> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", conversationId)
    .eq("organization_id", actor.organizationId)
    .maybeSingle<ConversationRow>();

  if (error) fail("load_conversation", error, "Unable to load the conversation.");
  if (!data || !canSeeConversation(actor, data)) notFound();

  let readOnly = false;

  if (data.kind === "project") {
    if (!data.projects) notFound();
    readOnly = data.projects.deleted_at !== null;
  }

  if (data.kind === "direct" && options.forWrite) {
    const peerId = directPeerId(data, actor.userId);
    readOnly = !(await activeMembers(actor.organizationId, [peerId])).has(peerId);
  }

  if (options.forWrite && readOnly) {
    throw new AppError(
      data.kind === "project"
        ? "This project was deleted, so its channel is read-only."
        : "This person is no longer an active member, so the conversation is read-only.",
      409
    );
  }

  return { row: data, readOnly };
}

/** Every conversation the actor can see, without previews or unread counts. */
async function listAccessibleConversationRows(actor: MessagingActor) {
  const general = supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("organization_id", actor.organizationId)
    .eq("kind", "general")
    .returns<ConversationRow[]>();

  const projects = CHANNEL_ROLES.includes(actor.role)
    ? supabase
        .from("conversations")
        .select("id, organization_id, kind, project_id, direct_key, last_message_at, projects!inner ( title, deleted_at )")
        .eq("organization_id", actor.organizationId)
        .eq("kind", "project")
        .is("projects.deleted_at", null)
        .returns<ConversationRow[]>()
    : null;

  const participations = supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", actor.userId)
    .returns<Array<{ conversation_id: string }>>();

  const [generalResult, projectResult, participationResult] = await Promise.all([general, projects, participations]);

  if (generalResult.error) fail("list_general", generalResult.error, "Unable to load conversations.");
  if (projectResult?.error) fail("list_project_channels", projectResult.error, "Unable to load conversations.");
  if (participationResult.error) fail("list_participations", participationResult.error, "Unable to load conversations.");

  const directIds = participationResult.data.map((row) => row.conversation_id);
  let directs: ConversationRow[] = [];

  if (directIds.length > 0) {
    const { data, error } = await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .eq("organization_id", actor.organizationId)
      .eq("kind", "direct")
      .in("id", directIds)
      .returns<ConversationRow[]>();
    if (error) fail("list_direct", error, "Unable to load conversations.");
    directs = data.filter((row) => canSeeConversation(actor, row));
  }

  return [...generalResult.data, ...(projectResult?.data ?? []), ...directs];
}

async function unreadCounts(actor: MessagingActor, conversationIds: string[]) {
  const counts = new Map<string, { unreadCount: number; unreadMentions: number }>();
  if (conversationIds.length === 0) return counts;

  const { data, error } = await supabase.rpc("messaging_unread_counts", {
    p_user_id: actor.userId,
    p_conversation_ids: conversationIds,
    p_since: actor.memberSince,
  });

  if (error) fail("unread_counts", error, "Unable to load unread counts.");

  const rows = (data ?? []) as Array<{ conversation_id: string; unread_count: number; unread_mentions: number }>;
  for (const row of rows) {
    counts.set(row.conversation_id, {
      unreadCount: Number(row.unread_count),
      unreadMentions: Number(row.unread_mentions),
    });
  }

  return counts;
}

export async function getUnreadSummary(actor: MessagingActor): Promise<UnreadSummary> {
  const rows = await listAccessibleConversationRows(actor);
  const counts = await unreadCounts(actor, rows.map((row) => row.id));
  const conversations = [...counts].map(([id, count]) => ({ id, ...count }));

  return {
    totalUnread: conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    totalMentions: conversations.reduce((sum, item) => sum + item.unreadMentions, 0),
    conversations,
  };
}

function previewText(body: string, names: Map<string, string>) {
  const text = body.replace(/<@([0-9a-f-]{36})>/gi, (_token, userId: string) => `@${names.get(userId.toLowerCase()) ?? "someone"}`);
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text;
}

export async function listConversations(actor: MessagingActor): Promise<ConversationSummary[]> {
  const rows = await listAccessibleConversationRows(actor);
  const ids = rows.map((row) => row.id);

  const [counts, previews] = await Promise.all([
    unreadCounts(actor, ids),
    Promise.all(
      rows.map(async (row) => {
        const { data, error } = await supabase
          .from("messages")
          .select("body, sender_user_id")
          .eq("conversation_id", row.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ body: string; sender_user_id: string | null }>();
        if (error) fail("conversation_preview", error, "Unable to load conversations.");
        return [row.id, data] as const;
      })
    ),
  ]);

  const previewById = new Map(previews);
  const peerIds = rows.filter((row) => row.kind === "direct").map((row) => directPeerId(row, actor.userId));
  const mentionedIds = [...previewById.values()].flatMap((preview) => (preview ? parseMentionUserIds(preview.body) : []));
  const senderIds = [...previewById.values()].flatMap((preview) => (preview?.sender_user_id ? [preview.sender_user_id] : []));

  const [names, activePeers] = await Promise.all([
    resolvePeople(actor.organizationId, [...peerIds, ...mentionedIds, ...senderIds]),
    activeMembers(actor.organizationId, peerIds),
  ]);

  const summaries = rows.map((row): ConversationSummary => {
    const preview = previewById.get(row.id) ?? null;
    const peer = row.kind === "direct" ? person(names, directPeerId(row, actor.userId)) : null;
    const count = counts.get(row.id) ?? { unreadCount: 0, unreadMentions: 0 };

    return {
      id: row.id,
      kind: row.kind,
      title: row.kind === "general" ? "General" : row.kind === "project" ? row.projects?.title ?? "Project" : peer?.name ?? "Direct message",
      projectId: row.project_id,
      directPeer: peer,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: preview
        ? {
            senderName: preview.sender_user_id ? person(names, preview.sender_user_id).name : null,
            text: previewText(preview.body, names),
          }
        : null,
      ...count,
      readOnly: peer ? !activePeers.has(peer.userId) : false,
    };
  });

  const kindOrder: Record<ConversationKind, number> = { general: 0, project: 1, direct: 1 };
  return summaries.sort(
    (left, right) =>
      kindOrder[left.kind] - kindOrder[right.kind] ||
      (right.lastMessageAt ?? "").localeCompare(left.lastMessageAt ?? "") ||
      left.title.localeCompare(right.title)
  );
}

/** Opens the direct conversation between the actor and another active member, creating it once. */
export async function getOrCreateDirectConversation(actor: MessagingActor, otherUserId: string) {
  if (otherUserId === actor.userId) {
    throw new AppError("You can't start a direct message with yourself.", 400);
  }

  if (!(await activeMembers(actor.organizationId, [otherUserId])).has(otherUserId)) {
    throw new AppError("Member not found.", 404);
  }

  const directKey = directConversationKey(actor.userId, otherUserId);

  const findExisting = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("organization_id", actor.organizationId)
      .eq("kind", "direct")
      .eq("direct_key", directKey)
      .maybeSingle<{ id: string }>();
    if (error) fail("find_direct", error, "Unable to open the conversation.");
    return data;
  };

  let conversation = await findExisting();
  let created = false;

  if (!conversation) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        organization_id: actor.organizationId,
        kind: "direct",
        direct_key: directKey,
        created_by_user_id: actor.userId,
      })
      .select("id")
      .single<{ id: string }>();

    if (error?.code === "23505") {
      // The other person opened it at the same moment.
      conversation = await findExisting();
    } else if (error || !data) {
      fail("create_direct", error, "Unable to open the conversation.");
    } else {
      conversation = data;
      created = true;
    }
  }

  if (!conversation) fail("create_direct", null, "Unable to open the conversation.");

  const { error: participantError } = await supabase
    .from("conversation_participants")
    .upsert(
      [actor.userId, otherUserId].map((userId) => ({ conversation_id: conversation.id, user_id: userId })),
      { onConflict: "conversation_id,user_id", ignoreDuplicates: true }
    );

  if (participantError) {
    if (created) await supabase.from("conversations").delete().eq("id", conversation.id);
    fail("add_direct_participants", participantError, "Unable to open the conversation.");
  }

  const names = await resolvePeople(actor.organizationId, [otherUserId]);
  return { id: conversation.id, kind: "direct" as const, directPeer: person(names, otherUserId), created };
}

// Tasks -------------------------------------------------------------------------------------------

async function viewerEmployeeId(actor: MessagingActor) {
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", actor.organizationId)
    .eq("user_id", actor.userId)
    .maybeSingle<{ id: string }>();
  if (error) fail("viewer_employee", error, "Unable to load task details.");
  return data?.id ?? null;
}

/**
 * Tasks the actor may see, using the same rules as GET /tasks: admins and supervisors see every
 * task in the organization, employees only tasks assigned to them.
 */
async function accessibleTasks(actor: MessagingActor, taskIds: string[]) {
  const tasks = new Map<string, TaskRow>();
  if (taskIds.length === 0) return tasks;

  const { data, error } = await supabase
    .from("tasks")
    .select("id, project_id, title, status, assigned_employee_id, projects!inner ( organization_id )")
    .in("id", taskIds)
    .eq("projects.organization_id", actor.organizationId)
    .is("deleted_at", null)
    .returns<TaskRow[]>();

  if (error) fail("accessible_tasks", error, "Unable to load task details.");

  const employeeId = actor.role === "employee" ? await viewerEmployeeId(actor) : null;

  for (const task of data) {
    if (actor.role !== "employee" || (employeeId !== null && task.assigned_employee_id === employeeId)) {
      tasks.set(task.id, task);
    }
  }

  return tasks;
}

async function assigneesFor(organizationId: string, employeeIds: string[]) {
  const assignees = new Map<string, MessagingPerson>();
  if (employeeIds.length === 0) return assignees;

  const { data, error } = await supabase
    .from("employees")
    .select("id, user_id, full_name")
    .eq("organization_id", organizationId)
    .in("id", [...new Set(employeeIds)])
    .returns<Array<{ id: string; user_id: string; full_name: string }>>();

  if (error) fail("task_assignees", error, "Unable to load task details.");
  for (const employee of data) assignees.set(employee.id, { userId: employee.user_id, name: employee.full_name });
  return assignees;
}

/** Builds each tagged task's chip for this viewer. Tasks they can't see get `{ accessible: false }`. */
async function resolveTaskChips(actor: MessagingActor, taskIds: string[]) {
  const chips = new Map<string, TaskChip>();
  const tasks = await accessibleTasks(actor, [...new Set(taskIds)]);
  const visibleIds = [...tasks.keys()];

  const [progress, assignees] = await Promise.all([
    visibleIds.length
      ? supabase
          .from("task_progress")
          .select("task_id, progress_percentage, created_at")
          .in("task_id", visibleIds)
          .order("created_at", { ascending: false })
          .returns<Array<{ task_id: string; progress_percentage: number }>>()
      : null,
    assigneesFor(
      actor.organizationId,
      [...tasks.values()].flatMap((task) => (task.assigned_employee_id ? [task.assigned_employee_id] : []))
    ),
  ]);

  if (progress?.error) fail("task_progress", progress.error, "Unable to load task details.");

  const latestProgress = new Map<string, number>();
  for (const row of progress?.data ?? []) {
    if (!latestProgress.has(row.task_id)) latestProgress.set(row.task_id, row.progress_percentage);
  }

  for (const taskId of taskIds) {
    const task = tasks.get(taskId);
    chips.set(
      taskId,
      task
        ? {
            accessible: true,
            taskId: task.id,
            title: task.title,
            status: task.status,
            // Same rule as the task board: completed work is always 100%.
            progressPercent: task.status === "completed" ? 100 : latestProgress.get(task.id) ?? 0,
            assignee: task.assigned_employee_id ? assignees.get(task.assigned_employee_id) ?? null : null,
          }
        : { accessible: false }
    );
  }

  return chips;
}

// Messages ----------------------------------------------------------------------------------------

async function hydrateMessages(actor: MessagingActor, rows: MessageRow[]): Promise<MessageView[]> {
  const liveIds = rows.filter((row) => row.deleted_at === null).map((row) => row.id);

  const [mentions, reactions, taskRefs] = liveIds.length
    ? await Promise.all([
        supabase.from("message_mentions").select("message_id, user_id").in("message_id", liveIds)
          .returns<Array<{ message_id: string; user_id: string }>>(),
        supabase.from("message_reactions").select("message_id, user_id, emoji, created_at").in("message_id", liveIds)
          .order("created_at", { ascending: true })
          .returns<Array<{ message_id: string; user_id: string; emoji: string }>>(),
        supabase.from("message_task_refs").select("message_id, task_id").in("message_id", liveIds)
          .eq("organization_id", actor.organizationId)
          .returns<Array<{ message_id: string; task_id: string | null }>>(),
      ])
    : [null, null, null];

  if (mentions?.error) fail("message_mentions", mentions.error, "Unable to load messages.");
  if (reactions?.error) fail("message_reactions", reactions.error, "Unable to load messages.");
  if (taskRefs?.error) fail("message_task_refs", taskRefs.error, "Unable to load messages.");

  const peopleIds = [
    ...rows.flatMap((row) => (row.sender_user_id ? [row.sender_user_id] : [])),
    ...(mentions?.data ?? []).map((mention) => mention.user_id),
  ];

  const taskIdByMessage = new Map((taskRefs?.data ?? []).map((ref) => [ref.message_id, ref.task_id]));
  const taskIds = [...taskIdByMessage.values()].filter((taskId): taskId is string => taskId !== null);

  const [names, chips] = await Promise.all([
    resolvePeople(actor.organizationId, peopleIds),
    resolveTaskChips(actor, taskIds),
  ]);

  return rows.map((row): MessageView => {
    const deleted = row.deleted_at !== null;
    const reactionRows = deleted ? [] : (reactions?.data ?? []).filter((reaction) => reaction.message_id === row.id);
    const grouped = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const reaction of reactionRows) {
      const entry = grouped.get(reaction.emoji) ?? { count: 0, reactedByMe: false };
      entry.count += 1;
      entry.reactedByMe ||= reaction.user_id === actor.userId;
      grouped.set(reaction.emoji, entry);
    }

    const hasTaskRef = !deleted && taskIdByMessage.has(row.id);
    const taskId = taskIdByMessage.get(row.id) ?? null;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      kind: row.kind,
      body: deleted ? "" : row.body,
      sender: row.sender_user_id ? person(names, row.sender_user_id) : null,
      clientId: row.sender_user_id === actor.userId ? row.client_id : null,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      deletedAt: row.deleted_at,
      updatedAt: row.updated_at,
      mentions: deleted
        ? []
        : (mentions?.data ?? []).filter((mention) => mention.message_id === row.id).map((mention) => person(names, mention.user_id)),
      reactions: [...grouped].map(([emoji, entry]) => ({ emoji, ...entry })),
      // A tag whose task was later deleted still renders, as an unavailable chip.
      task: hasTaskRef ? (taskId ? chips.get(taskId) ?? { accessible: false } : { accessible: false }) : null,
    };
  });
}

export async function listMessages(
  actor: MessagingActor,
  conversationId: string,
  options: { cursor?: unknown; limit?: number } = {}
): Promise<MessagePage> {
  await loadConversation(actor, conversationId);

  const cursor = decodeMessageCursor(options.cursor);
  const limit = Math.min(Math.max(options.limit ?? PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);

  let query = supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .eq("organization_id", actor.organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.or(`created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`);
  }

  const { data, error } = await query.returns<MessageRow[]>();
  if (error) fail("list_messages", error, "Unable to load messages.");

  const page = data.slice(0, limit);
  const last = page[page.length - 1];

  return {
    messages: await hydrateMessages(actor, page),
    nextCursor: data.length > limit && last ? encodeMessageCursor({ createdAt: last.created_at, id: last.id }) : null,
  };
}

/** Polling: messages created or changed (edited, deleted, reacted to) after `updatedSince`. */
export async function listMessageChanges(
  actor: MessagingActor,
  conversationId: string,
  updatedSince: string
): Promise<MessageChanges> {
  const since = Date.parse(updatedSince);
  if (Number.isNaN(since)) throw new AppError("updatedSince must be a timestamp.", 400);

  await loadConversation(actor, conversationId);

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .eq("organization_id", actor.organizationId)
    .gt("updated_at", new Date(since - CHANGES_OVERLAP_MS).toISOString())
    .order("updated_at", { ascending: true })
    .limit(CHANGES_LIMIT + 1)
    .returns<MessageRow[]>();

  if (error) fail("list_message_changes", error, "Unable to load messages.");

  const changes = data.slice(0, CHANGES_LIMIT);
  const syncedAt = changes.reduce(
    (latest, row) => (Date.parse(row.updated_at) > Date.parse(latest) ? row.updated_at : latest),
    new Date(since).toISOString()
  );

  return {
    messages: await hydrateMessages(actor, changes),
    syncedAt,
    hasMore: data.length > CHANGES_LIMIT,
  };
}

async function loadMessage(actor: MessagingActor, conversationId: string, messageId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .eq("organization_id", actor.organizationId)
    .maybeSingle<MessageRow>();

  if (error) fail("load_message", error, "Unable to load the message.");
  if (!data) throw new AppError("Message not found.", 404);
  return data;
}

async function hydrateOne(actor: MessagingActor, conversationId: string, messageId: string) {
  const [message] = await hydrateMessages(actor, [await loadMessage(actor, conversationId, messageId)]);
  return message;
}

/** Everyone mentioned must be able to see the conversation, or the mention would point nowhere. */
async function validateMentions(actor: MessagingActor, conversation: ConversationRow, body: string) {
  const mentioned = parseMentionUserIds(body);
  if (mentioned.length === 0) return mentioned;

  const members = await activeMembers(actor.organizationId, mentioned);
  const allowed = mentioned.every((userId) => {
    const role = members.get(userId);
    if (!role) return false;
    return canSeeConversation({ userId, role }, conversation);
  });

  if (!allowed) {
    throw new AppError("You can only mention people who can see this conversation.", 400);
  }

  return mentioned;
}

async function insertMentions(messageId: string, userIds: string[]) {
  if (userIds.length === 0) return null;
  const { error } = await supabase
    .from("message_mentions")
    .insert(userIds.map((userId) => ({ message_id: messageId, user_id: userId })));
  return error;
}

async function postMessage(
  actor: MessagingActor,
  conversation: ConversationRow,
  input: { body: string; kind: MessageKind; clientId: string; taskId?: string; mentions: string[] }
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      organization_id: actor.organizationId,
      sender_user_id: actor.userId,
      kind: input.kind,
      body: input.body,
      client_id: input.clientId,
    })
    .select(MESSAGE_COLUMNS)
    .single<MessageRow>();

  if (error?.code === "23505") {
    // A retry of a send that already went through: return the original.
    const { data: existing, error: existingError } = await supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("sender_user_id", actor.userId)
      .eq("client_id", input.clientId)
      .eq("organization_id", actor.organizationId)
      .maybeSingle<MessageRow>();
    if (existingError) fail("find_retried_message", existingError, "Unable to send the message.");
    if (!existing || existing.conversation_id !== conversation.id) {
      throw new AppError("clientId was already used for a different message.", 409);
    }
    return existing;
  }

  if (error || !data) fail("insert_message", error, "Unable to send the message.");

  const mentionError = await insertMentions(data.id, input.mentions);
  const taskError = input.taskId
    ? (await supabase.from("message_task_refs").insert({
        message_id: data.id,
        organization_id: actor.organizationId,
        task_id: input.taskId,
      })).error
    : null;

  if (mentionError || taskError) {
    // No multi-statement transactions through the API: undo the message so nothing half-posts.
    await supabase.from("messages").delete().eq("id", data.id);
    fail("insert_message_details", mentionError ?? taskError, "Unable to send the message.");
  }

  const { error: touchError } = await supabase
    .from("conversations")
    .update({ last_message_at: data.created_at })
    .eq("id", conversation.id)
    .eq("organization_id", actor.organizationId);
  if (touchError) fail("touch_conversation", touchError, "Unable to send the message.");

  return data;
}

export async function sendMessage(
  actor: MessagingActor,
  conversationId: string,
  input: SendMessageInput
): Promise<MessageView> {
  const { row: conversation } = await loadConversation(actor, conversationId, { forWrite: true });
  const body = normalizeMessageBody(input.body);
  const mentions = await validateMentions(actor, conversation, body);

  if (input.taskId && !(await accessibleTasks(actor, [input.taskId])).has(input.taskId)) {
    throw new AppError("Task not found.", 404);
  }

  const row = await postMessage(actor, conversation, {
    body,
    kind: "text",
    clientId: input.clientId ?? crypto.randomUUID(),
    taskId: input.taskId,
    mentions,
  });

  const [message] = await hydrateMessages(actor, [row]);
  return message;
}

function assertOwnLiveMessage(actor: MessagingActor, message: MessageRow, action: "edit" | "delete") {
  if (message.sender_user_id !== actor.userId) {
    throw new AppError(`You can only ${action} your own messages.`, 403);
  }
}

export async function editMessage(
  actor: MessagingActor,
  conversationId: string,
  messageId: string,
  rawBody: unknown
): Promise<MessageView> {
  const { row: conversation } = await loadConversation(actor, conversationId, { forWrite: true });
  const message = await loadMessage(actor, conversationId, messageId);

  assertOwnLiveMessage(actor, message, "edit");
  if (message.deleted_at) throw new AppError("This message was deleted.", 409);
  if (message.kind !== "text") throw new AppError("Progress requests can't be edited.", 409);

  const body = normalizeMessageBody(rawBody);
  const mentions = await validateMentions(actor, conversation, body);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("messages")
    .update({ body, edited_at: now, updated_at: now })
    .eq("id", messageId)
    .eq("organization_id", actor.organizationId);
  if (error) fail("edit_message", error, "Unable to edit the message.");

  const { error: clearError } = await supabase.from("message_mentions").delete().eq("message_id", messageId);
  if (clearError) fail("edit_message_mentions", clearError, "Unable to edit the message.");
  const mentionError = await insertMentions(messageId, mentions);
  if (mentionError) fail("edit_message_mentions", mentionError, "Unable to edit the message.");

  return hydrateOne(actor, conversationId, messageId);
}

/** Soft delete: the row stays for ordering, but its text, mentions, reactions and task tag are gone. */
export async function deleteMessage(
  actor: MessagingActor,
  conversationId: string,
  messageId: string
): Promise<MessageView> {
  await loadConversation(actor, conversationId);
  const message = await loadMessage(actor, conversationId, messageId);

  assertOwnLiveMessage(actor, message, "delete");

  if (!message.deleted_at) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("messages")
      .update({ body: "", deleted_at: now, updated_at: now })
      .eq("id", messageId)
      .eq("organization_id", actor.organizationId);
    if (error) fail("delete_message", error, "Unable to delete the message.");

    for (const table of ["message_mentions", "message_reactions", "message_task_refs"] as const) {
      const { error: detailError } = await supabase.from(table).delete().eq("message_id", messageId);
      if (detailError) fail(`delete_message_${table}`, detailError, "Unable to delete the message.");
    }
  }

  return hydrateOne(actor, conversationId, messageId);
}

async function reactionTarget(actor: MessagingActor, conversationId: string, messageId: string, emoji: string) {
  if (!isAllowedEmoji(emoji)) throw new AppError("That emoji isn't available for reactions.", 400);

  await loadConversation(actor, conversationId, { forWrite: true });
  const message = await loadMessage(actor, conversationId, messageId);
  if (message.deleted_at) throw new AppError("You can't react to a deleted message.", 409);
  return message;
}

async function touchMessage(actor: MessagingActor, messageId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("organization_id", actor.organizationId);
  if (error) fail("touch_message", error, "Unable to update the reaction.");
}

export async function addReaction(actor: MessagingActor, conversationId: string, messageId: string, emoji: string) {
  await reactionTarget(actor, conversationId, messageId, emoji);

  const { error } = await supabase
    .from("message_reactions")
    .upsert({ message_id: messageId, user_id: actor.userId, emoji }, { onConflict: "message_id,user_id,emoji", ignoreDuplicates: true });
  if (error) fail("add_reaction", error, "Unable to add the reaction.");

  await touchMessage(actor, messageId);
  return hydrateOne(actor, conversationId, messageId);
}

export async function removeReaction(actor: MessagingActor, conversationId: string, messageId: string, emoji: string) {
  await reactionTarget(actor, conversationId, messageId, emoji);

  const { error } = await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", actor.userId)
    .eq("emoji", emoji);
  if (error) fail("remove_reaction", error, "Unable to remove the reaction.");

  await touchMessage(actor, messageId);
  return hydrateOne(actor, conversationId, messageId);
}

/** Moves the read marker forward to `messageId` (or now). It never moves backwards. */
export async function markConversationRead(actor: MessagingActor, conversationId: string, messageId?: string) {
  await loadConversation(actor, conversationId);

  const readAt = messageId
    ? (await loadMessage(actor, conversationId, messageId)).created_at
    : new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("conversation_reads")
    .select("last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", actor.userId)
    .maybeSingle<{ last_read_at: string }>();
  if (existingError) fail("load_read_marker", existingError, "Unable to mark the conversation as read.");

  if (existing && Date.parse(existing.last_read_at) >= Date.parse(readAt)) {
    return { conversationId, lastReadAt: new Date(existing.last_read_at).toISOString() };
  }

  const { error } = await supabase
    .from("conversation_reads")
    .upsert({ conversation_id: conversationId, user_id: actor.userId, last_read_at: readAt }, { onConflict: "conversation_id,user_id" });
  if (error) fail("mark_read", error, "Unable to mark the conversation as read.");

  return { conversationId, lastReadAt: new Date(readAt).toISOString() };
}

/**
 * "Ask for update": posts a progress request, tagged to the task and mentioning the assignee, in
 * the direct conversation with the assignee. It never changes task data.
 */
export async function requestTaskProgress(actor: MessagingActor, taskId: string): Promise<ProgressRequestResult> {
  const task = (await accessibleTasks(actor, [taskId])).get(taskId);
  if (!task) throw new AppError("Task not found.", 404);
  if (!task.assigned_employee_id) throw new AppError("This task has no assignee to ask.", 409);

  const assignee = (await assigneesFor(actor.organizationId, [task.assigned_employee_id])).get(task.assigned_employee_id);
  if (!assignee) throw new AppError("This task has no assignee to ask.", 409);
  if (assignee.userId === actor.userId) throw new AppError("You're the assignee of this task.", 409);

  const direct = await getOrCreateDirectConversation(actor, assignee.userId);
  const { row: conversation } = await loadConversation(actor, direct.id, { forWrite: true });

  const row = await postMessage(actor, conversation, {
    body: `${mentionToken(assignee.userId)} ${PROGRESS_REQUEST_TEXT}`,
    kind: "progress_request",
    clientId: crypto.randomUUID(),
    taskId,
    mentions: [assignee.userId],
  });

  await logActivity({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    eventType: "task_progress_requested",
    taskId,
    projectId: task.project_id,
    metadata: { conversationId: direct.id, messageId: row.id },
  });

  const [message] = await hydrateMessages(actor, [row]);
  return { conversationId: direct.id, recipient: direct.directPeer, message };
}

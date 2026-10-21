import type { OrganizationMembershipRole } from "./organization.js";
import type { TaskStatus } from "./task.js";

export type ConversationKind = "general" | "project" | "direct";
export type MessageKind = "text" | "progress_request";

/** Who is asking, resolved from the verified organization context. Never taken from the request body. */
export interface MessagingActor {
  userId: string;
  organizationId: string;
  role: OrganizationMembershipRole;
  /** When the caller joined the organization; earlier messages never count as unread. */
  memberSince: string | null;
}

export interface MessagingPerson {
  userId: string;
  name: string;
}

export interface MessagingMember extends MessagingPerson {
  role: OrganizationMembershipRole;
}

export interface ConversationSummary {
  id: string;
  kind: ConversationKind;
  title: string;
  projectId: string | null;
  directPeer: MessagingPerson | null;
  lastMessageAt: string | null;
  lastMessagePreview: { senderName: string | null; text: string } | null;
  unreadCount: number;
  unreadMentions: number;
  /** Deleted project, or a DM whose other member is no longer active. */
  readOnly: boolean;
}

export interface UnreadSummary {
  totalUnread: number;
  totalMentions: number;
  conversations: Array<{ id: string; unreadCount: number; unreadMentions: number }>;
}

/** A tagged task as one viewer may see it. Inaccessible tasks carry no task data at all. */
export type TaskChip =
  | {
      accessible: true;
      taskId: string;
      title: string;
      status: TaskStatus;
      progressPercent: number;
      assignee: MessagingPerson | null;
    }
  | { accessible: false };

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface MessageView {
  id: string;
  conversationId: string;
  kind: MessageKind;
  /** Always "" for a deleted message. */
  body: string;
  sender: MessagingPerson | null;
  /** Only returned to the sender, so their client can match an optimistic message. */
  clientId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
  mentions: MessagingPerson[];
  reactions: MessageReactionSummary[];
  task: TaskChip | null;
}

export interface MessagePage {
  messages: MessageView[];
  /** Pass as `cursor` to load the next, older page. Null when there are no older messages. */
  nextCursor: string | null;
}

export interface MessageChanges {
  /** New or changed messages, oldest change first. */
  messages: MessageView[];
  /** Pass back as `updatedSince` on the next poll. */
  syncedAt: string;
  /** More changes than one poll returns; reload the first page instead. */
  hasMore: boolean;
}

export interface SendMessageInput {
  body: unknown;
  clientId?: string;
  taskId?: string;
}

export interface ProgressRequestResult {
  conversationId: string;
  recipient: MessagingPerson;
  message: MessageView;
}

import type { BackendOrganizationMembershipRole, BackendTaskStatus } from '../../../types/backend'

// Mirrors backend/src/types/messaging.ts.

type ConversationKind = 'general' | 'project' | 'direct'
type MessageKind = 'text' | 'progress_request'

export interface MessagingPerson {
  userId: string
  name: string
}

/** A person shown by name with their avatar beside it. Mentions and task chips stay MessagingPerson. */
export interface MessagingPersonWithAvatar extends MessagingPerson {
  avatarVariant: string | null
}

export interface MessagingMember extends MessagingPersonWithAvatar {
  role: BackendOrganizationMembershipRole
}

/** Someone who can open a conversation right now (no email addresses). */
export interface ConversationMember extends MessagingMember {
  isProjectCreator: boolean
}

export interface ConversationSummary {
  id: string
  kind: ConversationKind
  title: string
  projectId: string | null
  directPeer: MessagingPersonWithAvatar | null
  lastMessageAt: string | null
  lastMessagePreview: { senderName: string | null; text: string } | null
  unreadCount: number
  unreadMentions: number
  readOnly: boolean
}

export interface UnreadSummary {
  totalUnread: number
  totalMentions: number
  conversations: Array<{ id: string; unreadCount: number; unreadMentions: number }>
}

export type TaskChip =
  | {
      accessible: true
      taskId: string
      title: string
      status: BackendTaskStatus
      progressPercent: number
      assignee: MessagingPerson | null
    }
  | { accessible: false }

interface MessageReaction {
  emoji: string
  count: number
  reactedByMe: boolean
}

export interface Message {
  id: string
  conversationId: string
  kind: MessageKind
  body: string
  sender: MessagingPersonWithAvatar | null
  clientId: string | null
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  updatedAt: string
  mentions: MessagingPerson[]
  reactions: MessageReaction[]
  task: TaskChip | null
  /** From before the viewer joined the channel; visible only because it tags a task now assigned to them. */
  shownForTask: boolean
}

export interface MessagePage {
  messages: Message[]
  nextCursor: string | null
}

export interface MessageChanges {
  messages: Message[]
  syncedAt: string
  hasMore: boolean
}

export interface DirectConversation {
  id: string
  kind: 'direct'
  directPeer: MessagingPersonWithAvatar
  created: boolean
}

export interface ProgressRequestResult {
  conversationId: string
  recipient: MessagingPerson
  message: Message
}

export interface SendMessageRequest {
  body: string
  clientId: string
  taskId?: string
}

/** A task attached in the composer before sending. */
export interface TaggedTask {
  id: string
  title: string
}

/** A message the user sent that the server has not confirmed yet. */
export interface OutgoingMessage {
  clientId: string
  body: string
  task: TaggedTask | null
  createdAt: string
  status: 'sending' | 'failed'
  error?: string
}

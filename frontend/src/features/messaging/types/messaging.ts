import type { BackendOrganizationMembershipRole, BackendTaskStatus } from '../../../types/backend'

// Mirrors backend/src/types/messaging.ts.

export type ConversationKind = 'general' | 'project' | 'direct'
export type MessageKind = 'text' | 'progress_request'

export interface MessagingPerson {
  userId: string
  name: string
}

export interface MessagingMember extends MessagingPerson {
  role: BackendOrganizationMembershipRole
}

export interface ConversationSummary {
  id: string
  kind: ConversationKind
  title: string
  projectId: string | null
  directPeer: MessagingPerson | null
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

export interface MessageReaction {
  emoji: string
  count: number
  reactedByMe: boolean
}

export interface Message {
  id: string
  conversationId: string
  kind: MessageKind
  body: string
  sender: MessagingPerson | null
  clientId: string | null
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  updatedAt: string
  mentions: MessagingPerson[]
  reactions: MessageReaction[]
  task: TaskChip | null
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
  directPeer: MessagingPerson
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

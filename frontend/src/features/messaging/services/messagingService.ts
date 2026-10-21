import { deleteJson, getJson, patchJson, postJson } from '../../../lib/api'
import type {
  ConversationSummary,
  DirectConversation,
  Message,
  MessageChanges,
  MessagePage,
  MessagingMember,
  ProgressRequestResult,
  SendMessageRequest,
  UnreadSummary,
} from '../types/messaging'

const base = '/messaging'
const conversationPath = (conversationId: string) => `${base}/conversations/${encodeURIComponent(conversationId)}`
const messagePath = (conversationId: string, messageId: string) =>
  `${conversationPath(conversationId)}/messages/${encodeURIComponent(messageId)}`

export function listConversations() {
  return getJson<ConversationSummary[]>(`${base}/conversations`)
}

export function getUnreadSummary() {
  return getJson<UnreadSummary>(`${base}/unread-summary`)
}

export function listMessagingMembers() {
  return getJson<MessagingMember[]>(`${base}/members`)
}

export function openDirectConversation(userId: string) {
  return postJson<DirectConversation>(`${base}/conversations/direct`, { userId })
}

export function listMessages(conversationId: string, cursor?: string | null) {
  return getJson<MessagePage>(`${conversationPath(conversationId)}/messages`, {
    params: cursor ? { cursor } : undefined,
  })
}

export function listMessageChanges(conversationId: string, updatedSince: string) {
  return getJson<MessageChanges>(`${conversationPath(conversationId)}/messages`, {
    params: { updatedSince },
  })
}

export function sendMessage(conversationId: string, request: SendMessageRequest) {
  return postJson<Message>(`${conversationPath(conversationId)}/messages`, request)
}

export function editMessage(conversationId: string, messageId: string, body: string) {
  return patchJson<Message>(messagePath(conversationId, messageId), { body })
}

export function deleteMessage(conversationId: string, messageId: string) {
  return deleteJson<Message>(messagePath(conversationId, messageId))
}

export function addReaction(conversationId: string, messageId: string, emoji: string) {
  return postJson<Message>(`${messagePath(conversationId, messageId)}/reactions`, { emoji })
}

export function removeReaction(conversationId: string, messageId: string, emoji: string) {
  return deleteJson<Message>(`${messagePath(conversationId, messageId)}/reactions/${encodeURIComponent(emoji)}`)
}

export function markConversationRead(conversationId: string, messageId?: string) {
  return postJson<{ conversationId: string; lastReadAt: string }>(
    `${conversationPath(conversationId)}/read`,
    messageId ? { messageId } : {},
  )
}

export function requestTaskProgress(taskId: string) {
  return postJson<ProgressRequestResult>(`${base}/progress-requests`, { taskId })
}

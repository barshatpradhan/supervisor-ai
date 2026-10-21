import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { listTasks } from '../../tasks/services/taskService'
import {
  getUnreadSummary,
  listConversationMembers,
  listConversations,
  listMessagingMembers,
} from '../services/messagingService'
import type { ConversationSummary } from '../types/messaging'
import { CONVERSATION_LIST_POLL_MS, UNREAD_POLL_MS } from '../utils/polling'

/** Background badge poll. Paused while the tab is hidden. */
export function useUnreadSummary(organizationId: string | null, enabled = true) {
  return useQuery({
    enabled: Boolean(organizationId) && enabled,
    queryFn: getUnreadSummary,
    queryKey: organizationId ? queryKeys.messaging.unread(organizationId) : ['messaging', 'unselected', 'unread'],
    refetchInterval: UNREAD_POLL_MS,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: UNREAD_POLL_MS / 2,
  })
}

export function useConversations(organizationId: string | null) {
  return useQuery({
    enabled: Boolean(organizationId),
    queryFn: listConversations,
    queryKey: organizationId ? queryKeys.messaging.conversations(organizationId) : ['messaging', 'unselected', 'conversations'],
    refetchInterval: CONVERSATION_LIST_POLL_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}

/**
 * Project id -> channel id for the channels this user can open. Shares the conversation list's
 * cache but does not poll, so pages outside Messages (the task board) add no polling.
 */
export function useProjectChannels(organizationId: string | null, enabled = true) {
  return useQuery({
    enabled: Boolean(organizationId) && enabled,
    queryFn: listConversations,
    queryKey: organizationId ? queryKeys.messaging.conversations(organizationId) : ['messaging', 'unselected', 'conversations'],
    retry: 1,
    select: (conversations: ConversationSummary[]) =>
      new Map(
        conversations
          .filter((conversation) => conversation.kind === 'project' && conversation.projectId && !conversation.readOnly)
          .map((conversation) => [conversation.projectId as string, conversation.id]),
      ),
    staleTime: 60_000,
  })
}

/** Who can open this conversation right now: the scope for @mention autocomplete. */
export function useConversationMembers(organizationId: string, conversationId: string) {
  return useQuery({
    queryFn: () => listConversationMembers(conversationId),
    queryKey: queryKeys.messaging.conversationMembers(organizationId, conversationId),
    retry: 1,
    staleTime: 60_000,
  })
}

/** The caller's own task list (GET /tasks is already limited to tasks they can access). */
export function useTaggableTasks(organizationId: string | null, enabled = true) {
  return useQuery({
    enabled: Boolean(organizationId) && enabled,
    queryFn: listTasks,
    queryKey: organizationId ? queryKeys.messaging.taggableTasks(organizationId) : ['messaging', 'unselected', 'taggable-tasks'],
    staleTime: 60_000,
  })
}

export function useMessagingMembers(organizationId: string | null) {
  return useQuery({
    enabled: Boolean(organizationId),
    queryFn: listMessagingMembers,
    queryKey: organizationId ? queryKeys.messaging.members(organizationId) : ['messaging', 'unselected', 'members'],
    staleTime: 5 * 60_000,
  })
}

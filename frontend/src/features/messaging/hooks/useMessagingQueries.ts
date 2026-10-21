import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { getUnreadSummary, listConversations, listMessagingMembers } from '../services/messagingService'
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

export function useMessagingMembers(organizationId: string | null) {
  return useQuery({
    enabled: Boolean(organizationId),
    queryFn: listMessagingMembers,
    queryKey: organizationId ? queryKeys.messaging.members(organizationId) : ['messaging', 'unselected', 'members'],
    staleTime: 5 * 60_000,
  })
}

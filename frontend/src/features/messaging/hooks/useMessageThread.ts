import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { queryKeys } from '../../../lib/api/queryKeys'
import {
  addReaction,
  deleteMessage,
  editMessage,
  listMessageChanges,
  listMessages,
  markConversationRead,
  removeReaction,
  sendMessage,
} from '../services/messagingService'
import type { Message, MessagePage, OutgoingMessage, TaggedTask } from '../types/messaging'
import { threadPollInterval } from '../utils/polling'
import { flattenThread, latestUpdatedAt, mergeMessages, type ThreadData } from '../utils/threadCache'

const EPOCH = new Date(0).toISOString()

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

function newClientId() {
  return globalThis.crypto.randomUUID()
}

/**
 * One open conversation: pages of history, a poll for new or changed messages, optimistic
 * sending with retry, and the read marker. Mount it once per conversation (key it by
 * conversation id), so the outbox and sync position never carry over to another conversation.
 */
export function useMessageThread(organizationId: string, conversationId: string, currentUserId: string | null) {
  const queryClient = useQueryClient()
  const threadKey = queryKeys.messaging.thread(organizationId, conversationId)
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([])
  const syncedAt = useRef<string | null>(null)
  const lastActivityAt = useRef(0)

  const thread = useInfiniteQuery<MessagePage, Error, ThreadData, typeof threadKey, string | null>({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
    queryFn: ({ pageParam }) => listMessages(conversationId, pageParam),
    queryKey: threadKey,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: Infinity,
  })

  useEffect(() => {
    // Opening a conversation starts on the fast poll.
    lastActivityAt.current = Date.now()
  }, [])

  const applyMessages = useCallback(
    (incoming: readonly Message[]) => {
      let changed = false
      queryClient.setQueryData<ThreadData>(threadKey, (data) => {
        const known = new Map(data?.pages.flatMap((page) => page.messages).map((message) => [message.id, message.updatedAt]))
        changed = incoming.some((message) => {
          const updatedAt = known.get(message.id)
          return !updatedAt || Date.parse(message.updatedAt) > Date.parse(updatedAt)
        })
        return mergeMessages(data, incoming)
      })
      if (changed) lastActivityAt.current = Date.now()
      return changed
    },
    // threadKey is derived from these two ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, organizationId, conversationId],
  )

  const isThreadLoaded = thread.status === 'success'

  // Polls only for messages created or changed since the last poll.
  useQuery({
    enabled: isThreadLoaded,
    queryFn: async () => {
      const since = syncedAt.current ?? latestUpdatedAt(thread.data) ?? EPOCH
      const changes = await listMessageChanges(conversationId, since)
      if (changes.hasMore) {
        await queryClient.invalidateQueries({ queryKey: threadKey })
      } else {
        applyMessages(changes.messages)
      }
      syncedAt.current = changes.syncedAt
      return changes.syncedAt
    },
    queryKey: queryKeys.messaging.changes(organizationId, conversationId),
    refetchInterval: () => threadPollInterval(lastActivityAt.current),
    refetchIntervalInBackground: false,
    staleTime: 0,
  })

  const messages = useMemo(() => flattenThread(thread.data), [thread.data])

  // Drop outbox entries the server has confirmed, whichever way the confirmation arrived.
  const confirmedClientIds = useMemo(
    () => new Set(messages.flatMap((message) => (message.clientId ? [message.clientId] : []))),
    [messages],
  )
  const pending = outbox.filter((entry) => !confirmedClientIds.has(entry.clientId))

  const sendMutation = useMutation({
    mutationFn: (entry: OutgoingMessage) =>
      sendMessage(conversationId, { body: entry.body, clientId: entry.clientId, taskId: entry.task?.id }),
    onError: (error, entry) => {
      setOutbox((current) =>
        current.map((item) => (item.clientId === entry.clientId ? { ...item, status: 'failed', error: errorMessage(error) } : item)),
      )
    },
    onSuccess: (message, entry) => {
      applyMessages([message])
      setOutbox((current) => current.filter((item) => item.clientId !== entry.clientId))
      void queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations(organizationId) })
    },
  })

  const send = useCallback(
    (body: string, task: TaggedTask | null) => {
      const entry: OutgoingMessage = {
        body,
        clientId: newClientId(),
        createdAt: new Date().toISOString(),
        status: 'sending',
        task,
      }
      lastActivityAt.current = Date.now()
      setOutbox((current) => [...current, entry])
      sendMutation.mutate(entry)
    },
    [sendMutation],
  )

  /** Re-sends with the same clientId, so a send that did reach the server is not posted twice. */
  const retry = useCallback(
    (clientId: string) => {
      const entry = outbox.find((item) => item.clientId === clientId)
      if (!entry) return
      const retrying = { ...entry, error: undefined, status: 'sending' as const }
      setOutbox((current) => current.map((item) => (item.clientId === clientId ? retrying : item)))
      sendMutation.mutate(retrying)
    },
    [outbox, sendMutation],
  )

  const discard = useCallback((clientId: string) => {
    setOutbox((current) => current.filter((item) => item.clientId !== clientId))
  }, [])

  const updateMutation = useMutation({
    mutationFn: (action: () => Promise<Message>) => action(),
    onSuccess: (message) => applyMessages([message]),
  })

  const edit = (messageId: string, body: string) =>
    updateMutation.mutateAsync(() => editMessage(conversationId, messageId, body))
  const remove = (messageId: string) => updateMutation.mutateAsync(() => deleteMessage(conversationId, messageId))
  const toggleReaction = (message: Message, emoji: string) => {
    const mine = message.reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByMe)
    return updateMutation.mutateAsync(() =>
      mine ? removeReaction(conversationId, message.id, emoji) : addReaction(conversationId, message.id, emoji),
    )
  }

  // Mark as read when the newest message from someone else changes while the thread is open.
  const newestFromOthers = useMemo(
    () => [...messages].reverse().find((message) => message.sender?.userId !== currentUserId && !message.deletedAt)?.id ?? null,
    [messages, currentUserId],
  )
  const markedRead = useRef<string | null>(null)

  useEffect(() => {
    if (!isThreadLoaded) return
    const marker = `${conversationId}:${newestFromOthers ?? 'empty'}`
    if (markedRead.current === marker || document.visibilityState === 'hidden') return
    markedRead.current = marker

    markConversationRead(conversationId, newestFromOthers ?? undefined)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.messaging.unread(organizationId) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations(organizationId) })
      })
      .catch(() => {
        // Retried on the next new message; unread counts stay as they were.
        markedRead.current = null
      })
  }, [conversationId, isThreadLoaded, newestFromOthers, organizationId, queryClient])

  return {
    discard,
    edit,
    error: thread.error,
    fetchOlder: thread.fetchNextPage,
    hasOlder: thread.hasNextPage,
    isFetchingOlder: thread.isFetchingNextPage,
    isLoading: thread.isPending,
    messages,
    pending,
    refetch: thread.refetch,
    remove,
    retry,
    send,
    toggleReaction,
  }
}

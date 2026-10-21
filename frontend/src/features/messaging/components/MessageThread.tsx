import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FolderKanban, Hash, ListChecks, Menu, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { StateBlock } from '../../../components/ui/StateBlock'
import { queryKeys } from '../../../lib/api/queryKeys'
import type { BackendOrganizationMembershipRole } from '../../../types/backend'
import { useMessageThread } from '../hooks/useMessageThread'
import { requestTaskProgress } from '../services/messagingService'
import type { ConversationSummary, MessagingMember } from '../types/messaging'
import { bodyToDraft } from '../utils/messageBody'
import { MessageComposer } from './MessageComposer'
import { MessageItem } from './MessageItem'

interface MessageThreadProps {
  conversation: ConversationSummary
  organizationId: string
  currentUserId: string | null
  currentRole: BackendOrganizationMembershipRole | null
  members: MessagingMember[] | undefined
  onOpenConversations: () => void
}

const CHANNEL_ROLES: readonly BackendOrganizationMembershipRole[] = ['organization_admin', 'supervisor']

export function MessageThread({
  conversation,
  currentRole,
  currentUserId,
  members,
  onOpenConversations,
  organizationId,
}: MessageThreadProps) {
  const queryClient = useQueryClient()
  const thread = useMessageThread(organizationId, conversation.id, currentUserId)
  const [sentNotice, setSentNotice] = useState<{ name: string; conversationId: string } | null>(null)
  const [askError, setAskError] = useState<string | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  // Who could be @mentioned: people who can see this conversation.
  const mentionable = useMemo(() => {
    const others = (members ?? []).filter((member) => member.userId !== currentUserId)
    if (conversation.kind === 'general') return others
    if (conversation.kind === 'project') return others.filter((member) => CHANNEL_ROLES.includes(member.role))
    return conversation.directPeer ? [conversation.directPeer] : []
  }, [conversation, currentUserId, members])

  const askForUpdate = useMutation({
    mutationFn: requestTaskProgress,
    onError: (error) => setAskError(error instanceof Error ? error.message : 'The request could not be sent.'),
    onSuccess: (result) => {
      setAskError(null)
      setSentNotice({ conversationId: result.conversationId, name: result.recipient.name })
      void queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations(organizationId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.messaging.thread(organizationId, result.conversationId) })
    },
  })

  // Follow new messages to the bottom.
  const lastId = thread.messages[thread.messages.length - 1]?.id
  const pendingCount = thread.pending.length
  useEffect(() => {
    listEndRef.current?.scrollIntoView?.({ block: 'end' })
  }, [lastId, pendingCount])

  const canAskForUpdate = currentRole !== null && CHANNEL_ROLES.includes(currentRole)
  const TitleIcon = conversation.kind === 'general' ? Hash : conversation.kind === 'project' ? FolderKanban : null
  const disabledReason = conversation.readOnly
    ? conversation.kind === 'project'
      ? 'This project was deleted, so its channel is read-only.'
      : 'This person is no longer an active member, so this conversation is read-only.'
    : null

  return (
    <section aria-labelledby="thread-title" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border-default px-4 py-3">
        <button
          aria-label="Show conversations"
          className="inline-flex size-9 items-center justify-center rounded-control text-text-secondary hover:bg-surface-muted lg:hidden"
          onClick={onOpenConversations}
          type="button"
        >
          <Menu aria-hidden="true" size={18} />
        </button>
        {TitleIcon ? <TitleIcon aria-hidden="true" className="text-text-secondary" size={18} /> : <Avatar name={conversation.title} size={28} />}
        <h2 className="m-0 min-w-0 flex-1 truncate text-base font-semibold text-text-primary" id="thread-title">{conversation.title}</h2>
        {conversation.kind === 'project' && conversation.projectId ? (
          <Link className="text-sm font-semibold text-text-link" to={`/projects/${conversation.projectId}`}>Open project</Link>
        ) : null}
      </header>

      {sentNotice ? (
        <div className="flex items-center gap-2 border-b border-border-default bg-primary-50 px-4 py-2 text-sm text-primary-800" role="status">
          <CheckCircle2 aria-hidden="true" size={16} />
          <span className="flex-1">
            Sent to {sentNotice.name} in a direct message.{' '}
            <Link className="font-semibold text-primary-700 underline" to={`/messages/${sentNotice.conversationId}`}>Open conversation</Link>
          </span>
          <button aria-label="Dismiss" className="rounded-control p-1 hover:bg-primary-100" onClick={() => setSentNotice(null)} type="button">
            <X aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}
      {askError ? <p className="m-0 border-b border-border-default bg-danger-bg px-4 py-2 text-sm text-danger-fg" role="alert">{askError}</p> : null}

      <div aria-busy={thread.isLoading} aria-label={`Messages in ${conversation.title}`} aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-4" role="log">
        {thread.isLoading ? <StateBlock kind="loading" title="Loading messages" /> : null}
        {thread.error ? (
          <StateBlock action={<Button onClick={() => void thread.refetch()} variant="secondary">Try again</Button>} kind="error" title="Messages could not be loaded">
            {thread.error instanceof Error ? thread.error.message : null}
          </StateBlock>
        ) : null}

        {!thread.isLoading && !thread.error ? (
          <>
            {thread.hasOlder ? (
              <div className="mb-2 flex justify-center">
                <Button disabled={thread.isFetchingOlder} onClick={() => void thread.fetchOlder()} variant="ghost">
                  {thread.isFetchingOlder ? 'Loading…' : 'Load older messages'}
                </Button>
              </div>
            ) : null}

            {thread.messages.length === 0 && thread.pending.length === 0 ? (
              <StateBlock title="No messages yet">
                {conversation.kind === 'direct' ? `Say hello to ${conversation.title}.` : `Start the conversation in ${conversation.title}.`}
              </StateBlock>
            ) : null}

            <ul className="m-0 flex list-none flex-col p-0">
              {thread.messages.map((message) => (
                <MessageItem
                  askingTaskId={askForUpdate.isPending ? askForUpdate.variables ?? null : null}
                  canAskForUpdate={canAskForUpdate}
                  currentUserId={currentUserId}
                  key={message.id}
                  message={message}
                  onAskForUpdate={(taskId) => askForUpdate.mutate(taskId)}
                  onDelete={thread.remove}
                  onEdit={thread.edit}
                  onToggleReaction={thread.toggleReaction}
                  readOnly={conversation.readOnly}
                />
              ))}
              {thread.pending.map((entry) => (
                <li
                  aria-label={entry.status === 'failed' ? 'Message not sent' : 'Sending message'}
                  className="flex gap-3 px-2 py-2 opacity-80"
                  key={entry.clientId}
                >
                  <Avatar name="You" size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 whitespace-pre-wrap break-words text-sm text-text-primary">{bodyToDraft(entry.body, members ?? [])}</p>
                    {entry.task ? (
                      <p className="m-0 mt-1 inline-flex items-center gap-1 text-xs text-text-secondary">
                        <ListChecks aria-hidden="true" size={12} /> {entry.task.title}
                      </p>
                    ) : null}
                    {entry.status === 'sending' ? (
                      <p className="m-0 mt-1 text-xs text-text-tertiary" role="status">Sending…</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" role="alert">
                        <span className="text-danger-fg">Not sent{entry.error ? `: ${entry.error}` : '.'}</span>
                        <button className="inline-flex items-center gap-1 font-semibold text-primary-700 underline" onClick={() => thread.retry(entry.clientId)} type="button">
                          <RotateCcw aria-hidden="true" size={12} /> Retry
                        </button>
                        <button className="font-semibold text-text-secondary underline" onClick={() => thread.discard(entry.clientId)} type="button">Discard</button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div ref={listEndRef} />
          </>
        ) : null}
      </div>

      <MessageComposer
        conversationTitle={conversation.title}
        disabledReason={disabledReason}
        mentionable={mentionable}
        onSend={thread.send}
        organizationId={organizationId}
      />
    </section>
  )
}

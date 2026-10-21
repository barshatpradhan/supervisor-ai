import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { StateBlock } from '../../../components/ui/StateBlock'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useConversations, useMessagingMembers, useTaggableTasks } from '../hooks/useMessagingQueries'
import { openDirectConversation } from '../services/messagingService'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { NewDirectMessageDialog } from './NewDirectMessageDialog'

/** Two panes: conversations on the left, the open thread on the right. Below lg the list is a drawer. */
export function MessagingModule() {
  const { conversationId = null } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const organizationId = activeOrganization?.id ?? null
  const conversations = useConversations(organizationId)
  const members = useMessagingMembers(organizationId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newMessageOpen, setNewMessageOpen] = useState(false)

  // "Ask about this task" opens /messages/:id?task=<taskId>. The task is tagged only if it is one
  // of the caller's own accessible tasks and, in a project channel, belongs to that project.
  const [searchParams, setSearchParams] = useSearchParams()
  const askTaskId = searchParams.get('task')
  const taggableTasks = useTaggableTasks(organizationId, Boolean(askTaskId))

  const openDirect = useMutation({
    mutationFn: openDirectConversation,
    onSuccess: async (direct) => {
      setNewMessageOpen(false)
      await conversations.refetch()
      navigate(`/messages/${direct.id}`)
    },
  })

  // With no conversation chosen, open General.
  const firstConversationId = conversations.data?.[0]?.id
  useEffect(() => {
    if (!conversationId && firstConversationId) navigate(`/messages/${firstConversationId}`, { replace: true })
  }, [conversationId, firstConversationId, navigate])

  const active = conversations.data?.find((conversation) => conversation.id === conversationId) ?? null
  const askTask = askTaskId
    ? taggableTasks.data?.find(
        (task) => task.id === askTaskId && (active?.kind !== 'project' || task.project_id === active.projectId),
      ) ?? null
    : null
  const prefillTask = askTask ? { id: askTask.id, title: askTask.title } : null

  // A DM opened from elsewhere ("Ask for update") may not be in a list fetched earlier.
  const { isFetching, refetch } = conversations
  const isMissing = Boolean(conversationId && conversations.data && !active)
  useEffect(() => {
    if (isMissing && !isFetching) void refetch()
    // Refetch once per missing id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isMissing])

  if (!organizationId) return null

  const list = (onNavigate?: () => void) => (
    <ConversationList
      activeConversationId={conversationId}
      conversations={conversations.data}
      error={conversations.error}
      isLoading={conversations.isPending}
      onNavigate={onNavigate}
      onNewMessage={() => {
        openDirect.reset()
        setNewMessageOpen(true)
      }}
      onRetry={() => void conversations.refetch()}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-2xl font-bold text-text-primary">Messages</h1>
      <div className="grid h-[calc(100vh-13rem)] min-h-[28rem] overflow-hidden rounded-card border border-border-default bg-surface-card lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border-default lg:block">{list()}</aside>

        <div className="min-h-0">
          {active && organizationId ? (
            <MessageThread
              conversation={active}
              currentRole={activeMembershipRole}
              currentUserId={user?.id ?? null}
              key={active.id}
              onOpenConversations={() => setDrawerOpen(true)}
              onPrefillUsed={() =>
                setSearchParams((params) => {
                  params.delete('task')
                  return params
                }, { replace: true })
              }
              organizationId={organizationId}
              prefillTask={prefillTask}
            />
          ) : (
            <div className="p-6">
              {conversations.isPending || (isMissing && conversations.isFetching) ? (
                <StateBlock kind="loading" title="Loading conversation" />
              ) : isMissing ? (
                <StateBlock title="Conversation not found">It may have been removed, or you may not have access to it.</StateBlock>
              ) : conversations.error ? null : (
                <StateBlock title="No conversations yet" />
              )}
              <button
                className="mt-4 text-sm font-semibold text-text-link underline lg:hidden"
                onClick={() => setDrawerOpen(true)}
                type="button"
              >
                Show conversations
              </button>
            </div>
          )}
        </div>
      </div>

      <DialogPrimitive.Root onOpenChange={setDrawerOpen} open={drawerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-surface-overlay lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[min(85vw,20rem)] border-r border-border-default bg-surface-card shadow-overlay focus:outline-none lg:hidden">
            <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
              <DialogPrimitive.Title className="m-0 text-base font-semibold">Conversations</DialogPrimitive.Title>
              <DialogPrimitive.Close aria-label="Close conversations" className="rounded-control p-1 text-text-secondary hover:bg-surface-muted">
                <X aria-hidden="true" size={18} />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">Choose a channel or direct message.</DialogPrimitive.Description>
            <div className="h-[calc(100%-3.5rem)]">{list(() => setDrawerOpen(false))}</div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <NewDirectMessageDialog
        currentUserId={user?.id ?? null}
        error={openDirect.error instanceof Error ? openDirect.error.message : null}
        isOpening={openDirect.isPending}
        members={members.data}
        onChoose={(userId) => openDirect.mutate(userId)}
        onOpenChange={setNewMessageOpen}
        open={newMessageOpen}
      />
    </div>
  )
}

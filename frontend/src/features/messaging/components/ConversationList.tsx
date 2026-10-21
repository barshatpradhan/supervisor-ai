import { FolderKanban, Hash, Plus } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { StateBlock } from '../../../components/ui/StateBlock'
import type { ConversationSummary } from '../types/messaging'

interface ConversationListProps {
  activeConversationId: string | null
  conversations: ConversationSummary[] | undefined
  isLoading: boolean
  error: unknown
  onRetry: () => void
  onNewMessage: () => void
  onNavigate?: () => void
}

function unreadLabel(conversation: ConversationSummary) {
  if (conversation.unreadCount === 0) return ''
  const mentions = conversation.unreadMentions > 0 ? `, ${conversation.unreadMentions} mentioning you` : ''
  return `, ${conversation.unreadCount} unread${mentions}`
}

function ConversationLink({ active, conversation, onNavigate }: { active: boolean; conversation: ConversationSummary; onNavigate?: () => void }) {
  const unread = conversation.unreadCount > 0
  const icon =
    conversation.kind === 'general' ? <Hash aria-hidden="true" size={16} /> :
    conversation.kind === 'project' ? <FolderKanban aria-hidden="true" size={16} /> :
    <Avatar name={conversation.title} size={22} />

  return (
    <NavLink
      aria-current={active ? 'page' : undefined}
      aria-label={`${conversation.title}${unreadLabel(conversation)}`}
      className={[
        'flex min-h-11 items-center gap-2.5 rounded-control px-2.5 py-1.5 text-sm no-underline transition',
        active ? 'bg-primary-100 text-primary-800' : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
      ].join(' ')}
      onClick={onNavigate}
      to={`/messages/${conversation.id}`}
    >
      <span className="inline-flex size-6 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={['block truncate', unread ? 'font-semibold text-text-primary' : ''].join(' ')}>{conversation.title}</span>
        {conversation.lastMessagePreview ? (
          <span className="block truncate text-xs text-text-tertiary">
            {conversation.lastMessagePreview.senderName ? `${conversation.lastMessagePreview.senderName}: ` : ''}
            {conversation.lastMessagePreview.text}
          </span>
        ) : null}
      </span>
      {unread ? (
        <span aria-hidden="true" className="inline-flex min-w-5 items-center justify-center rounded-pill bg-primary-600 px-1.5 text-xs font-semibold text-text-on-primary">
          {conversation.unreadMentions > 0 ? '@' : ''}{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
        </span>
      ) : null}
    </NavLink>
  )
}

export function ConversationList({
  activeConversationId,
  conversations,
  error,
  isLoading,
  onNavigate,
  onNewMessage,
  onRetry,
}: ConversationListProps) {
  const channels = (conversations ?? []).filter((conversation) => conversation.kind !== 'direct')
  const directs = (conversations ?? []).filter((conversation) => conversation.kind === 'direct')

  return (
    <nav aria-label="Conversations" className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      {isLoading ? <StateBlock compact kind="loading" title="Loading conversations" /> : null}
      {error ? (
        <StateBlock
          action={<button className="text-sm font-semibold text-primary-700 underline" onClick={onRetry} type="button">Try again</button>}
          compact
          kind="error"
          title="Conversations could not be loaded"
        />
      ) : null}

      {conversations ? (
        <>
          <section aria-labelledby="channels-heading">
            <h2 className="label m-0 px-2.5 pb-1 text-text-tertiary" id="channels-heading">Channels</h2>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {channels.map((conversation) => (
                <li key={conversation.id}>
                  <ConversationLink active={conversation.id === activeConversationId} conversation={conversation} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="direct-heading">
            <div className="flex items-center justify-between px-2.5 pb-1">
              <h2 className="label m-0 text-text-tertiary" id="direct-heading">Direct messages</h2>
              <button
                aria-label="New direct message"
                className="inline-flex size-7 items-center justify-center rounded-control text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                onClick={onNewMessage}
                title="New direct message"
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
              </button>
            </div>
            {directs.length === 0 ? (
              <p className="m-0 px-2.5 text-sm text-text-tertiary">No direct messages yet.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {directs.map((conversation) => (
                  <li key={conversation.id}>
                    <ConversationLink active={conversation.id === activeConversationId} conversation={conversation} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </nav>
  )
}

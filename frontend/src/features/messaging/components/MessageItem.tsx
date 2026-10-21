import { ClipboardCheck, Pencil, SmilePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import type { Message } from '../types/messaging'
import { emojiName } from '../utils/emoji'
import { bodyToDraft, draftToBody, MESSAGE_MAX_LENGTH, splitMessageBody } from '../utils/messageBody'
import { EmojiPicker } from './EmojiPicker'
import { TaskChip } from './TaskChip'

interface MessageItemProps {
  message: Message
  currentUserId: string | null
  canAskForUpdate: boolean
  readOnly: boolean
  askingTaskId: string | null
  onAskForUpdate: (taskId: string) => void
  onEdit: (messageId: string, body: string) => Promise<unknown>
  onDelete: (messageId: string) => Promise<unknown>
  onToggleReaction: (message: Message, emoji: string) => Promise<unknown>
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function MessageItem({
  askingTaskId,
  canAskForUpdate,
  currentUserId,
  message,
  onAskForUpdate,
  onDelete,
  onEdit,
  onToggleReaction,
  readOnly,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isMine = message.sender !== null && message.sender.userId === currentUserId
  const isDeleted = message.deletedAt !== null
  const senderName = message.sender?.name ?? 'Deleted user'
  const created = new Date(message.createdAt)
  const task = message.task
  const isAssigneeOfRequest =
    message.kind === 'progress_request' && task?.accessible === true && task.assignee?.userId === currentUserId

  async function run(action: () => Promise<unknown>) {
    setActionError(null)
    try {
      await action()
      return true
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'That did not work. Please try again.')
      return false
    }
  }

  async function saveEdit() {
    const body = draftToBody(draft, message.mentions)
    if (!body || body.length > MESSAGE_MAX_LENGTH) return
    if (await run(() => onEdit(message.id, body))) setIsEditing(false)
  }

  return (
    <li className="group relative flex gap-3 rounded-control px-2 py-2 hover:bg-surface-muted/60">
      <Avatar name={senderName} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-text-primary">{senderName}</span>
          <time className="text-xs text-text-tertiary" dateTime={message.createdAt} title={dateTimeFormat.format(created)}>
            {timeFormat.format(created)}
          </time>
          {message.editedAt && !isDeleted ? <span className="text-xs text-text-tertiary">(edited)</span> : null}
        </div>

        {message.kind === 'progress_request' && !isDeleted ? (
          <p className="label m-0 mt-1 inline-flex items-center gap-1 text-primary-700">
            <ClipboardCheck aria-hidden="true" size={14} /> Progress request
          </p>
        ) : null}

        {isDeleted ? (
          <p className="m-0 mt-0.5 text-sm italic text-text-tertiary">This message was deleted.</p>
        ) : isEditing ? (
          <div className="mt-1 flex flex-col gap-2">
            <label className="sr-only" htmlFor={`edit-${message.id}`}>Edit message</label>
            <textarea
              autoFocus
              className="min-h-20 w-full resize-y rounded-control border border-border-strong bg-surface-card p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-focus-ring"
              id={`edit-${message.id}`}
              maxLength={MESSAGE_MAX_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  void saveEdit()
                }
                if (event.key === 'Escape') setIsEditing(false)
              }}
              value={draft}
            />
            <div className="flex gap-2">
              <Button className="min-h-8 px-3 py-1" disabled={!draft.trim()} onClick={() => void saveEdit()}>Save</Button>
              <Button className="min-h-8 px-3 py-1" onClick={() => setIsEditing(false)} variant="ghost">Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="m-0 mt-0.5 whitespace-pre-wrap break-words text-sm text-text-primary">
            {splitMessageBody(message.body, message.mentions).map((segment, index) =>
              segment.type === 'text' ? (
                <span key={index}>{segment.text}</span>
              ) : (
                <span
                  className={[
                    'rounded px-0.5 font-semibold',
                    segment.userId === currentUserId ? 'bg-primary-100 text-primary-800' : 'text-primary-700',
                  ].join(' ')}
                  key={index}
                >
                  @{segment.name}
                </span>
              ),
            )}
          </p>
        )}

        {task && !isDeleted ? (
          <TaskChip
            chip={task}
            isAsking={task.accessible && askingTaskId === task.taskId}
            onAskForUpdate={
              canAskForUpdate && task.accessible && task.assignee && task.assignee.userId !== currentUserId
                ? onAskForUpdate
                : undefined
            }
          />
        ) : null}

        {isAssigneeOfRequest && task?.accessible ? (
          <Link
            className="mt-2 inline-flex min-h-8 items-center rounded-control bg-primary-600 px-3 text-sm font-semibold text-text-on-primary no-underline hover:bg-primary-700"
            to={`/tasks/${task.taskId}?update=progress`}
          >
            Update progress
          </Link>
        ) : null}

        {!isDeleted && message.reactions.length > 0 ? (
          <ul aria-label="Reactions" className="m-0 mt-2 flex list-none flex-wrap gap-1 p-0">
            {message.reactions.map((reaction) => (
              <li key={reaction.emoji}>
                <button
                  aria-label={`${emojiName(reaction.emoji)}: ${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}${reaction.reactedByMe ? ', including yours' : ''}`}
                  aria-pressed={reaction.reactedByMe}
                  className={[
                    'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs',
                    reaction.reactedByMe
                      ? 'border-primary-300 bg-primary-100 text-primary-800'
                      : 'border-border-default bg-surface-card text-text-secondary hover:bg-surface-muted',
                  ].join(' ')}
                  disabled={readOnly}
                  onClick={() => void run(() => onToggleReaction(message, reaction.emoji))}
                  type="button"
                >
                  <span aria-hidden="true">{reaction.emoji}</span>
                  <span aria-hidden="true">{reaction.count}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {confirmDelete ? (
          <div className="mt-2 flex items-center gap-2 text-sm" role="group" aria-label="Confirm delete">
            <span className="text-text-secondary">Delete this message?</span>
            <Button className="min-h-8 px-3 py-1" onClick={() => void run(() => onDelete(message.id)).then(() => setConfirmDelete(false))} variant="danger">Delete</Button>
            <Button className="min-h-8 px-3 py-1" onClick={() => setConfirmDelete(false)} variant="ghost">Cancel</Button>
          </div>
        ) : null}

        {actionError ? <p className="m-0 mt-1 text-xs text-danger-fg" role="alert">{actionError}</p> : null}
      </div>

      {!isDeleted && !isEditing && !readOnly ? (
        <div className="absolute right-2 top-1 flex items-center gap-0.5 rounded-control border border-border-default bg-surface-card opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100">
          <EmojiPicker align="end" label="Add reaction" onSelect={(emoji) => void run(() => onToggleReaction(message, emoji))}>
            <SmilePlus aria-hidden="true" size={16} />
          </EmojiPicker>
          {isMine && message.kind === 'text' ? (
            <button
              aria-label="Edit message"
              className="inline-flex size-9 items-center justify-center rounded-control text-text-secondary hover:bg-surface-muted hover:text-text-primary"
              onClick={() => {
                setDraft(bodyToDraft(message.body, message.mentions))
                setIsEditing(true)
              }}
              title="Edit"
              type="button"
            >
              <Pencil aria-hidden="true" size={16} />
            </button>
          ) : null}
          {isMine ? (
            <button
              aria-label="Delete message"
              className="inline-flex size-9 items-center justify-center rounded-control text-text-secondary hover:bg-danger-bg hover:text-danger-fg"
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

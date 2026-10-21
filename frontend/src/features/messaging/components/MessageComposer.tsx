import { AtSign, ListChecks, SendHorizontal, Smile, X } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { MessagingPerson, TaggedTask } from '../types/messaging'
import { activeMentionQuery, draftToBody, MESSAGE_MAX_LENGTH } from '../utils/messageBody'
import { EmojiPicker } from './EmojiPicker'
import { TaskTagPicker } from './TaskTagPicker'

interface MessageComposerProps {
  conversationTitle: string
  /** People who can see this conversation, for @mentions. */
  mentionable: readonly MessagingPerson[]
  organizationId: string
  onSend: (body: string, task: TaggedTask | null) => void
  /** When set, the composer is disabled and shows why. */
  disabledReason?: string | null
  /** A task to start with already tagged ("Ask about this task"). */
  initialTask?: TaggedTask | null
  /** People offered as one-click @mentions. Suggestions only: nobody is mentioned until chosen. */
  suggestedMentions?: readonly MessagingPerson[]
  /** In a project channel, limits the task picker to that project. */
  taskProjectId?: string | null
}

export function MessageComposer({
  conversationTitle,
  disabledReason = null,
  initialTask = null,
  mentionable,
  onSend,
  organizationId,
  suggestedMentions = [],
  taskProjectId = null,
}: MessageComposerProps) {
  const [draft, setDraft] = useState('')
  const [task, setTask] = useState<TaggedTask | null>(initialTask)
  const [mentioned, setMentioned] = useState<MessagingPerson[]>([])
  const [caret, setCaret] = useState(0)
  const [highlight, setHighlight] = useState(0)
  const [mentionsDismissed, setMentionsDismissed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listId = useId()
  const hintId = useId()

  const mention = mentionsDismissed ? null : activeMentionQuery(draft, caret)
  const suggestions = mention
    ? mentionable.filter((person) => person.name.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 6)
    : []
  const showSuggestions = suggestions.length > 0
  const body = draftToBody(draft, mentioned)
  const tooLong = body.length > MESSAGE_MAX_LENGTH
  const canSend = !disabledReason && body.length > 0 && !tooLong

  function insertAtCaret(text: string, replaceFrom = caret) {
    const next = `${draft.slice(0, replaceFrom)}${text}${draft.slice(caret)}`
    const nextCaret = replaceFrom + text.length
    setDraft(next)
    setCaret(nextCaret)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret)
    })
  }

  function chooseMention(person: MessagingPerson) {
    if (!mention) return
    insertAtCaret(`@${person.name} `, mention.start)
    setMentioned((current) => (current.some((entry) => entry.userId === person.userId) ? current : [...current, person]))
    setHighlight(0)
  }

  function addSuggestedMention(person: MessagingPerson) {
    const separator = draft.length > 0 && !/\s$/.test(draft) ? ' ' : ''
    const next = `${draft}${separator}@${person.name} `
    setDraft(next)
    setCaret(next.length)
    setMentioned((current) => (current.some((entry) => entry.userId === person.userId) ? current : [...current, person]))
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(next.length, next.length)
    })
  }

  // Offer each suggestion until it is in the draft.
  const openSuggestions = suggestedMentions.filter(
    (person) => !(mentioned.some((entry) => entry.userId === person.userId) && draft.includes(`@${person.name}`)),
  )

  function submit() {
    if (!canSend) return
    onSend(body, task)
    setDraft('')
    setTask(null)
    setMentioned([])
    setCaret(0)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (showSuggestions) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setHighlight((current) => (current + step + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        chooseMention(suggestions[Math.min(highlight, suggestions.length - 1)])
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setMentionsDismissed(true)
        return
      }
    }

    // Enter sends; Shift+Enter adds a line. Never send mid-composition (IME input).
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  if (disabledReason) {
    return (
      <div className="border-t border-border-default bg-surface-muted px-4 py-3 text-sm text-text-secondary" role="status">
        {disabledReason}
      </div>
    )
  }

  return (
    <form
      aria-label={`Send a message to ${conversationTitle}`}
      className="relative border-t border-border-default bg-surface-card px-3 py-3 sm:px-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {task ? (
        <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-control border border-border-primary bg-primary-50 px-2 py-1 text-sm">
          <ListChecks aria-hidden="true" className="shrink-0 text-primary-600" size={14} />
          <span className="truncate">Tagged: {task.title}</span>
          <button
            aria-label={`Remove tagged task ${task.title}`}
            className="rounded-control p-0.5 text-text-secondary hover:bg-primary-100"
            onClick={() => setTask(null)}
            type="button"
          >
            <X aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}

      {openSuggestions.length > 0 ? (
        <div aria-label="Suggested people to mention" className="mb-2 flex flex-wrap items-center gap-1.5" role="group">
          <span className="text-xs text-text-tertiary">Suggested:</span>
          {openSuggestions.map((person) => (
            <button
              aria-label={`Mention ${person.name}`}
              className="inline-flex items-center gap-1 rounded-pill border border-border-default bg-surface-card px-2 py-0.5 text-xs font-semibold text-text-primary hover:border-border-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-focus-ring"
              key={person.userId}
              onClick={() => addSuggestedMention(person)}
              type="button"
            >
              <AtSign aria-hidden="true" size={12} />
              {person.name}
            </button>
          ))}
        </div>
      ) : null}

      {showSuggestions ? (
        <ul
          aria-label="Mention someone"
          className="absolute bottom-full left-3 z-30 mb-1 m-0 w-64 list-none rounded-card border border-border-default bg-surface-card p-1 shadow-overlay"
          id={listId}
          role="listbox"
        >
          {suggestions.map((person, index) => (
            <li
              aria-selected={index === highlight}
              className={[
                'cursor-pointer rounded-control px-2 py-1.5 text-sm',
                index === highlight ? 'bg-primary-100 text-primary-800' : 'text-text-primary hover:bg-surface-muted',
              ].join(' ')}
              id={`${listId}-${index}`}
              key={person.userId}
              onMouseDown={(event) => {
                event.preventDefault()
                chooseMention(person)
              }}
              role="option"
            >
              {person.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-end gap-1 sm:gap-2">
        <div className="flex items-center">
          <EmojiPicker label="Insert emoji" onSelect={(emoji) => insertAtCaret(emoji)}>
            <Smile aria-hidden="true" size={18} />
          </EmojiPicker>
          <TaskTagPicker onSelect={setTask} organizationId={organizationId} projectId={taskProjectId} />
        </div>
        <label className="sr-only" htmlFor={`${listId}-input`}>Message {conversationTitle}</label>
        <textarea
          aria-activedescendant={showSuggestions ? `${listId}-${highlight}` : undefined}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? listId : undefined}
          aria-describedby={hintId}
          aria-expanded={showSuggestions}
          aria-invalid={tooLong || undefined}
          className="max-h-40 min-h-10 flex-1 resize-none rounded-control border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-focus-ring"
          id={`${listId}-input`}
          onChange={(event) => {
            setDraft(event.target.value)
            setCaret(event.target.selectionStart)
            setMentionsDismissed(false)
            setHighlight(0)
          }}
          onClick={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => setCaret(event.currentTarget.selectionStart)}
          placeholder={`Message ${conversationTitle}`}
          ref={textareaRef}
          role="combobox"
          rows={1}
          value={draft}
        />
        <button
          aria-label="Send message"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-600 text-text-on-primary transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          disabled={!canSend}
          type="submit"
        >
          <SendHorizontal aria-hidden="true" size={18} />
        </button>
      </div>
      <p className="m-0 mt-1 text-xs text-text-tertiary" id={hintId}>
        {tooLong
          ? <span className="text-danger-fg">{body.length - MESSAGE_MAX_LENGTH} characters over the limit.</span>
          : 'Enter to send, Shift+Enter for a new line, @ to mention.'}
      </p>
    </form>
  )
}

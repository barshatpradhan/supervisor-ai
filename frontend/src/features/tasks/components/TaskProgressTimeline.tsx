import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import type { TaskDisplay } from '../types/task'
import { formatTaskDate } from '../utils/taskPresentation'

interface TaskProgressTimelineProps {
  canComment: boolean
  commentError: string | null
  isPostingComment: boolean
  onPostComment: (comment: string) => Promise<boolean>
  task: TaskDisplay
}

export function TaskProgressTimeline({
  canComment,
  commentError,
  isPostingComment,
  onPostComment,
  task,
}: TaskProgressTimelineProps) {
  const [comment, setComment] = useState('')
  const updates = task.progress_history ?? []

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onPostComment(comment)) setComment('')
  }

  return (
    <section className="space-y-4 border-t border-border-subtle pt-6" aria-labelledby="task-updates-heading">
      <div>
        <h3 id="task-updates-heading" className="text-lg font-bold text-ink-900">Progress updates</h3>
        <p className="mt-1 text-sm text-ink-600">Updates and comments shared for this task.</p>
      </div>

      {canComment ? (
        <form className="grid gap-3 rounded-lg border border-border-subtle bg-surface-card-alt p-4" onSubmit={submitComment}>
          <label className="grid gap-2 text-sm font-semibold text-ink-800">
            Comment for the assigned employee
            <textarea
              className="min-h-24 rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200"
              maxLength={1200}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Share feedback, a question, or the next step."
              value={comment}
            />
          </label>
          {commentError ? <p className="text-sm font-medium text-danger-700">{commentError}</p> : null}
          <div className="flex justify-end"><Button disabled={isPostingComment} type="submit">{isPostingComment ? 'Posting…' : 'Post comment'}</Button></div>
        </form>
      ) : null}

      {updates.length ? (
        <ol className="space-y-3">
          {updates.map((update) => (
            <li key={update.id} className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-900">{update.progress_percentage}% progress</p>
                <time className="text-xs text-ink-500" dateTime={update.created_at}>{formatTaskDate(update.created_at)}</time>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-700">{update.notes?.trim() || 'Progress updated without a comment.'}</p>
            </li>
          ))}
        </ol>
      ) : <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm text-ink-600">No progress updates have been shared yet.</p>}
    </section>
  )
}

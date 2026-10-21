import { ListChecks, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { TaskChip as TaskChipData } from '../types/messaging'

interface TaskChipProps {
  chip: TaskChipData
  /** Shown when the viewer may ask the assignee for an update. */
  onAskForUpdate?: (taskId: string) => void
  isAsking?: boolean
}

/** A tagged task. Viewers without access get a placeholder with no task data at all. */
export function TaskChip({ chip, isAsking = false, onAskForUpdate }: TaskChipProps) {
  if (!chip.accessible) {
    return (
      <div className="mt-2 inline-flex items-center gap-2 rounded-control border border-dashed border-border-strong bg-surface-muted px-3 py-2 text-sm text-text-secondary">
        <Lock aria-hidden="true" size={14} />
        <span>Restricted task</span>
        <span className="sr-only">You don't have access to this task.</span>
      </div>
    )
  }

  return (
    <div
      aria-label={`Tagged task: ${chip.title}`}
      className="mt-2 flex max-w-md flex-col gap-2 rounded-control border border-border-primary bg-primary-50 px-3 py-2"
      role="group"
    >
      <div className="flex min-w-0 items-center gap-2">
        <ListChecks aria-hidden="true" className="shrink-0 text-primary-600" size={16} />
        <Link
          className="min-w-0 truncate text-sm font-semibold text-text-link underline-offset-4 hover:underline"
          to={`/tasks/${chip.taskId}`}
        >
          {chip.title}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
        <StatusBadge status={chip.status} />
        <span>{chip.assignee ? chip.assignee.name : 'Unassigned'}</span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-16 overflow-hidden rounded-pill bg-primary-100"
          >
            <span className="block h-full rounded-pill bg-primary-600" style={{ width: `${chip.progressPercent}%` }} />
          </span>
          <span>{chip.progressPercent}% complete</span>
        </span>
        {onAskForUpdate && chip.assignee ? (
          <button
            className="font-semibold text-primary-700 underline-offset-4 hover:underline disabled:opacity-60"
            disabled={isAsking}
            onClick={() => onAskForUpdate(chip.taskId)}
            type="button"
          >
            {isAsking ? 'Asking…' : 'Ask for update'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

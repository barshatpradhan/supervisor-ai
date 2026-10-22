import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { tokenColor } from '../../../components/charts/chartColors'
import { Avatar } from '../../../components/ui/Avatar'
import { PriorityTag } from '../../../components/ui/PriorityTag'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import type { BackendPriorityLevel, BackendTaskStatus } from '../../../types/backend'
import { taskStatusLabels } from '../utils/taskPresentation'
import { boardStatuses, formatHours, formatShortDate, statusColorTokens } from '../utils/taskBoard'

export interface TaskBoardCard {
  assigneeAvatarVariant: string | null
  assigneeName: string | null
  estimatedHours: number
  id: string
  priority: BackendPriorityLevel
  progress: number
  project: string
  projectId: string
  status: BackendTaskStatus
  title: string
  updatedAt: string
}

/**
 * Five status columns on surface-muted. Scrolls sideways when the screen is narrow.
 * `cardAction` adds a control under a card, outside its link (links can't be nested).
 */
export function TaskBoard({ cardAction, tasks }: { cardAction?: (task: TaskBoardCard) => ReactNode; tasks: TaskBoardCard[] }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1180px] grid-cols-5 gap-4">
        {boardStatuses.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status)
          return (
            <section aria-labelledby={`board-${status}`} className="flex flex-col gap-2.5 rounded-card bg-surface-muted p-3" key={status}>
              <h2 className="label m-0 flex items-center gap-2 px-1 pt-1 font-semibold text-text-primary" id={`board-${status}`}>
                <span aria-hidden="true" className="size-2 rounded-pill" style={{ background: tokenColor(statusColorTokens[status]) }} />
                {taskStatusLabels[status]}
                <span className="num-sm text-text-secondary">{columnTasks.length}</span>
              </h2>
              {columnTasks.length === 0 ? (
                <p className="helper m-0 rounded-card border border-dashed border-border-strong px-3 py-4 text-center text-text-secondary">No tasks</p>
              ) : null}
              {columnTasks.map((task) => {
                const action = cardAction?.(task)
                return (
                <div
                  className="flex flex-col rounded-card border border-border-default bg-surface-card transition hover:border-border-strong hover:shadow-raised"
                  key={task.id}
                >
                <Link
                  className="flex flex-col gap-2.5 rounded-card p-3.5 text-text-primary no-underline"
                  to={`/tasks/${task.id}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <PriorityTag priority={task.priority} />
                    <span className="num-xs text-text-tertiary">{formatHours(task.estimatedHours)}</span>
                  </span>
                  <span className="body-strong">{task.title}</span>
                  <span className="helper text-text-tertiary">{task.project}</span>
                  {status !== 'todo' ? (
                    <ProgressBar label={`${task.title} progress`} size="sm" tone={status === 'blocked' ? 'bad' : status === 'completed' ? 'good' : 'primary'} value={task.progress} />
                  ) : null}
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar name={task.assigneeName} size={28} variant={task.assigneeAvatarVariant} />
                      <span className="helper truncate text-text-secondary">{task.assigneeName ?? 'Unassigned'}</span>
                    </span>
                    <span className="num-xs shrink-0 text-text-tertiary">{formatShortDate(task.updatedAt)}</span>
                  </span>
                </Link>
                {action ? <div className="border-t border-border-default px-3.5 py-2">{action}</div> : null}
                </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}

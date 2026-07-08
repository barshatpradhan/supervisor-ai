import type { TaskPriority, TaskStatus } from '../types/task'
import {
  getTaskPriorityTone,
  getTaskStatusTone,
  taskPriorityLabels,
  taskStatusLabels,
} from '../utils/taskPresentation'

type TaskStatusBadgeProps =
  | {
      kind: 'status'
      value: TaskStatus
    }
  | {
      kind: 'priority'
      value: TaskPriority
    }

export function TaskStatusBadge({ kind, value }: TaskStatusBadgeProps) {
  const label = kind === 'status' ? taskStatusLabels[value] : taskPriorityLabels[value]
  const tone = kind === 'status' ? getTaskStatusTone(value) : getTaskPriorityTone(value)

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        tone,
      ].join(' ')}
    >
      {label}
    </span>
  )
}

import { PriorityTag } from '../../../components/ui/PriorityTag'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { TaskPriority, TaskStatus } from '../types/task'

type TaskStatusBadgeProps =
  | { kind: 'status'; value: TaskStatus }
  | { kind: 'priority'; value: TaskPriority }

/** Task status as a dot-and-word badge, priority as a signal tag. */
export function TaskStatusBadge(props: TaskStatusBadgeProps) {
  return props.kind === 'status' ? <StatusBadge status={props.value} /> : <PriorityTag priority={props.value} />
}

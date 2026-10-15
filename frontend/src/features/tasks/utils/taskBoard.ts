import type { BackendTaskStatus } from '../../../types/backend'
import type { TaskDisplay } from '../types/task'

/** Board column order. Cancelled tasks are left off the board. */
export const boardStatuses = ['todo', 'in_progress', 'review', 'blocked', 'completed'] as const satisfies readonly BackendTaskStatus[]

export const statusColorTokens: Record<BackendTaskStatus, string> = {
  blocked: 'status-blocked',
  cancelled: 'status-cancelled',
  completed: 'status-completed',
  in_progress: 'status-in-progress',
  review: 'status-review',
  todo: 'status-todo',
}

/** Latest logged progress; history arrives newest first. Completed work is always 100%. */
export function getTaskProgress(task: Pick<TaskDisplay, 'progress_history' | 'status'>) {
  if (task.status === 'completed') return 100
  return task.progress_history?.[0]?.progress_percentage ?? 0
}

export function formatShortDate(value: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(value))
}

export function formatHours(value: number) {
  return `${Number(value)}h`
}

/** Replaces the "Employee 1a2b3c4d" reference with a real name when the directory has it. */
export function resolveAssigneeName(task: TaskDisplay, employeeNames: ReadonlyMap<string, string>) {
  if (!task.assigned_employee_id) return null
  if (task.assignmentState === 'self') return 'You'
  return employeeNames.get(task.assigned_employee_id) ?? task.assignedEmployeeLabel
}

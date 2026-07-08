import type { BackendEmployeeProfile, BackendProject } from '../../../types/backend'
import type {
  CreateTaskRequest,
  Task,
  TaskDisplay,
  TaskFormErrors,
  TaskFormValues,
  TaskPriority,
  TaskProgressFormErrors,
  TaskProgressFormValues,
  TaskStatus,
} from '../types/task'

export const taskPriorityOptions: Array<{ label: string; value: TaskPriority }> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

export const taskStatusOptions: Array<{ label: string; value: TaskStatus }> = [
  { label: 'To do', value: 'todo' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'In review', value: 'review' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

export const taskStatusLabels: Record<TaskStatus, string> = {
  blocked: 'Blocked',
  cancelled: 'Cancelled',
  completed: 'Completed',
  in_progress: 'In progress',
  review: 'In review',
  todo: 'To do',
}

export const taskPriorityLabels: Record<TaskPriority, string> = {
  high: 'High',
  low: 'Low',
  medium: 'Medium',
  urgent: 'Urgent',
}

const statusToneClasses: Record<TaskStatus, string> = {
  blocked: 'border-danger-600/20 bg-danger-50 text-danger-700',
  cancelled: 'border-danger-600/20 bg-danger-50 text-danger-700',
  completed: 'border-success-fg/30 bg-success-bg/60 text-success-text',
  in_progress: 'border-info-fg/30 bg-info-bg/60 text-info-text',
  review: 'border-warning-fg/30 bg-warning-bg/70 text-warning-text',
  todo: 'border-border-subtle bg-surface-card-alt text-ink-700',
}

const priorityToneClasses: Record<TaskPriority, string> = {
  high: 'border-warning-fg/30 bg-warning-bg/70 text-warning-text',
  low: 'border-border-subtle bg-surface-card-alt text-ink-700',
  medium: 'border-info-fg/30 bg-info-bg/60 text-info-text',
  urgent: 'border-danger-600/20 bg-danger-50 text-danger-700',
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function formatReference(value: string, prefix: string) {
  return `${prefix} ${value.slice(0, 8)}`
}

export function getTaskStatusTone(status: TaskStatus) {
  return statusToneClasses[status]
}

export function getTaskPriorityTone(priority: TaskPriority) {
  return priorityToneClasses[priority]
}

export function formatTaskDate(value: string | null) {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatEstimatedHours(value: number) {
  return `${Number(value)} hr${Number(value) === 1 ? '' : 's'}`
}

export function buildTaskDisplayList(
  tasks: Task[],
  projects: BackendProject[] | null,
  employeeProfile: BackendEmployeeProfile | null,
) {
  const projectTitleById = new Map((projects ?? []).map((project) => [project.id, project.title]))

  return tasks.map<TaskDisplay>((task) => {
    const isSelfAssigned =
      employeeProfile !== null && task.assigned_employee_id === employeeProfile.id

    const assignedEmployeeLabel = task.assigned_employee_id
      ? isSelfAssigned
        ? 'You'
        : formatReference(task.assigned_employee_id, 'Employee')
      : 'Unassigned'

    return {
      ...task,
      assignedEmployeeLabel,
      assignmentState: isSelfAssigned
        ? 'self'
        : task.assigned_employee_id
          ? 'assigned'
          : 'unassigned',
      projectLabel:
        projectTitleById.get(task.project_id) ?? formatReference(task.project_id, 'Project'),
    }
  })
}

export function buildTaskFormValues(projectId?: string): TaskFormValues {
  return {
    description: '',
    estimatedHours: '1',
    priority: 'medium',
    projectId: projectId ?? '',
    title: '',
  }
}

export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {}

  if (!normalizeText(values.title)) {
    errors.title = 'Title is required.'
  }

  if (!values.projectId) {
    errors.projectId = 'Project selection is required.'
  }

  const estimatedHours = Number(values.estimatedHours)

  if (!Number.isFinite(estimatedHours) || estimatedHours < 0.25) {
    errors.estimatedHours = 'Estimated hours must be at least 0.25.'
  }

  return errors
}

export function createTaskRequestFromValues(values: TaskFormValues): CreateTaskRequest {
  return {
    description: normalizeText(values.description) || undefined,
    estimatedHours: Number(values.estimatedHours),
    priority: values.priority,
    projectId: values.projectId,
    title: normalizeText(values.title),
  }
}

export function buildTaskProgressFormValues(task: Task): TaskProgressFormValues {
  return {
    notes: '',
    progressPercentage: task.status === 'completed' ? '100' : '0',
    status: task.status === 'todo' ? 'in_progress' : task.status,
  }
}

export function validateTaskProgressForm(
  values: TaskProgressFormValues,
): TaskProgressFormErrors {
  const errors: TaskProgressFormErrors = {}
  const progressPercentage = Number(values.progressPercentage)

  if (
    !Number.isFinite(progressPercentage) ||
    progressPercentage < 0 ||
    progressPercentage > 100
  ) {
    errors.progressPercentage = 'Progress percentage must be between 0 and 100.'
  }

  return errors
}

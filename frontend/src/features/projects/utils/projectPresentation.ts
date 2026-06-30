import type { Project, ProjectFormErrors, ProjectFormValues, ProjectPriority, ProjectStatus } from '../types/project'

export const projectPriorityOptions: Array<{ label: string; value: ProjectPriority }> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: 'Active',
  cancelled: 'Cancelled',
  completed: 'Completed',
  draft: 'Draft',
  on_hold: 'On hold',
}

export const projectPriorityLabels: Record<ProjectPriority, string> = {
  high: 'High',
  low: 'Low',
  medium: 'Medium',
  urgent: 'Urgent',
}

const statusToneClasses: Record<ProjectStatus, string> = {
  active: 'border-success-fg/30 bg-success-bg/60 text-success-text',
  cancelled: 'border-danger-600/20 bg-danger-50 text-danger-700',
  completed: 'border-info-fg/30 bg-info-bg/60 text-info-text',
  draft: 'border-border-subtle bg-surface-card-alt text-ink-700',
  on_hold: 'border-warning-fg/30 bg-warning-bg/70 text-warning-text',
}

const priorityToneClasses: Record<ProjectPriority, string> = {
  high: 'border-warning-fg/30 bg-warning-bg/70 text-warning-text',
  low: 'border-border-subtle bg-surface-card-alt text-ink-700',
  medium: 'border-info-fg/30 bg-info-bg/60 text-info-text',
  urgent: 'border-danger-600/20 bg-danger-50 text-danger-700',
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function buildProjectFormValues(project?: Project): ProjectFormValues {
  return {
    description: project?.description ?? '',
    priority: project?.priority ?? 'medium',
    title: project?.title ?? '',
  }
}

export function validateProjectForm(
  values: ProjectFormValues,
  existingProject?: Project,
): ProjectFormErrors {
  const errors: ProjectFormErrors = {}

  if (!normalizeText(values.title)) {
    errors.title = 'Title is required.'
  }

  if ((existingProject?.description ?? '').trim().length > 0 && !normalizeText(values.description)) {
    errors.description =
      'Clearing a saved description is not supported by the current backend. Replace it with updated text instead.'
  }

  return errors
}

export function createProjectRequestFromValues(
  values: ProjectFormValues,
) {
  return {
    description: normalizeText(values.description) || undefined,
    priority: values.priority,
    title: normalizeText(values.title),
  }
}

export function updateProjectRequestFromValues(
  existingProject: Project,
  values: ProjectFormValues,
) {
  const request: {
    description?: string
    priority?: ProjectPriority
    title?: string
  } = {}
  const nextTitle = normalizeText(values.title)
  const nextDescription = normalizeText(values.description)
  const currentDescription = (existingProject.description ?? '').trim()

  if (nextTitle !== existingProject.title) {
    request.title = nextTitle
  }

  if (nextDescription && nextDescription !== currentDescription) {
    request.description = nextDescription
  }

  if (values.priority !== existingProject.priority) {
    request.priority = values.priority
  }

  return request
}

export function formatProjectDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getProjectStatusTone(status: ProjectStatus) {
  return statusToneClasses[status]
}

export function getProjectPriorityTone(priority: ProjectPriority) {
  return priorityToneClasses[priority]
}

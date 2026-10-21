import type { Project, ProjectFormErrors, ProjectFormValues, ProjectPriority } from '../types/project'

export const projectPriorityOptions: Array<{ label: string; value: ProjectPriority }> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

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


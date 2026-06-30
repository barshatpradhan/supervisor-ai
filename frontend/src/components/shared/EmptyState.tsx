import { Button } from '../ui/Button'

type EmptyStateKind = 'default' | 'projects' | 'tasks' | 'employees'

interface EmptyStateProps {
  actionLabel?: string
  kind?: EmptyStateKind
  description?: string
  onAction?: () => void
  title?: string
}

const defaultCopy: Record<Exclude<EmptyStateKind, 'default'>, { description: string; title: string }> = {
  employees: {
    description: 'Employee records will appear here once the directory is connected.',
    title: 'No employees yet',
  },
  projects: {
    description: 'Projects will appear here after the first project is created.',
    title: 'No projects yet',
  },
  tasks: {
    description: 'Tasks will appear here once a project has work items attached.',
    title: 'No tasks yet',
  },
}

export function EmptyState({
  actionLabel,
  description,
  kind = 'default',
  onAction,
  title,
}: EmptyStateProps) {
  const resolvedCopy = kind === 'default' ? undefined : defaultCopy[kind]
  const resolvedTitle = title ?? resolvedCopy?.title ?? 'Nothing here yet'
  const resolvedDescription =
    description ?? resolvedCopy?.description ?? 'Create a record to get started.'

  return (
    <div className="rounded-lg border border-dashed border-border-subtle bg-surface-card p-6 text-center">
      <h2 className="text-base font-semibold text-ink-900">{resolvedTitle}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">{resolvedDescription}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function ProjectsEmptyState(props: Omit<EmptyStateProps, 'kind'>) {
  return <EmptyState {...props} kind="projects" />
}

export function TasksEmptyState(props: Omit<EmptyStateProps, 'kind'>) {
  return <EmptyState {...props} kind="tasks" />
}

export function EmployeesEmptyState(props: Omit<EmptyStateProps, 'kind'>) {
  return <EmptyState {...props} kind="employees" />
}

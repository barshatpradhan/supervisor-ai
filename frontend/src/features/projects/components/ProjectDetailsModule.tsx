import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { parseApiError } from '../../../lib/api/errors'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useProject } from '../hooks/useProject'
import type { Project } from '../types/project'
import { formatProjectDate } from '../utils/projectPresentation'
import { ProjectStatusBadge } from './ProjectStatusBadge'

const futureSections = ['Documents', 'AI Analysis', 'Recommendations', 'Tasks', 'Activity']

function ProjectDetailsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading project details" className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
        <div className="h-9 w-2/5 animate-pulse rounded bg-surface-muted" />
        <div className="h-5 w-3/5 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className="h-11 animate-pulse rounded-lg bg-surface-muted" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="h-72 animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-72 animate-pulse rounded-xl bg-surface-muted" />
      </div>
      <span className="sr-only">Loading project details</span>
    </div>
  )
}

export function ProjectDetailsContent({
  isRefreshing = false,
  onRefresh,
  organizationName,
  project,
}: {
  isRefreshing?: boolean
  onRefresh?: () => void
  organizationName: string
  project: Project
}) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border-subtle pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-ink-600">{organizationName}</p>
          <h1 className="break-words text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{project.title}</h1>
          <div className="flex flex-wrap gap-2">
            <ProjectStatusBadge kind="status" value={project.status} />
            <ProjectStatusBadge kind="priority" value={project.priority} />
          </div>
        </div>
        <Button aria-label="Refresh project details" className="shrink-0" disabled={isRefreshing} onClick={onRefresh} variant="secondary">
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </header>

      <nav aria-label="Project sections" className="overflow-x-auto border-b border-border-subtle">
        <ul className="flex min-w-max gap-1" role="list">
          <li><span aria-current="page" className="inline-flex border-b-2 border-primary-600 px-3 py-3 text-sm font-semibold text-primary-700">Overview</span></li>
          {futureSections.map((section) => (
            <li key={section}>
              <span aria-label={`${section}: coming next`} className="inline-flex px-3 py-3 text-sm text-ink-500">{section}<span className="ml-2 text-xs">Coming next</span></span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="space-y-6">
          <Card aria-labelledby="project-description-heading">
            <h2 id="project-description-heading" className="text-lg font-semibold text-ink-900">Project overview</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink-700">
              {project.description?.trim() || 'No description has been added for this project.'}
            </p>
          </Card>
          <Card aria-labelledby="required-skills-heading">
            <h2 id="required-skills-heading" className="text-lg font-semibold text-ink-900">Required skills</h2>
            {project.required_skills.length ? (
              <ul aria-label="Required skills" className="mt-4 flex flex-wrap gap-2">
                {project.required_skills.map((skill) => <li key={skill} className="rounded-md border border-border-subtle bg-surface-card-alt px-3 py-1.5 text-sm font-medium text-ink-700">{skill}</li>)}
              </ul>
            ) : <p className="mt-3 text-sm text-ink-600">No required skills have been recorded for this project.</p>}
          </Card>
        </div>
        <Card aria-labelledby="project-metadata-heading">
          <h2 id="project-metadata-heading" className="text-lg font-semibold text-ink-900">Project metadata</h2>
          <dl className="mt-4 grid gap-3">
            <Metadata label="Status"><ProjectStatusBadge kind="status" value={project.status} /></Metadata>
            <Metadata label="Priority"><ProjectStatusBadge kind="priority" value={project.priority} /></Metadata>
            <Metadata label="Created">{formatProjectDate(project.created_at)}</Metadata>
            <Metadata label="Last updated">{formatProjectDate(project.updated_at)}</Metadata>
          </dl>
        </Card>
      </div>
    </div>
  )
}

function Metadata({ children, label }: { children: ReactNode; label: string }) {
  return <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-3"><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">{label}</dt><dd className="mt-2 text-sm font-medium text-ink-800">{children}</dd></div>
}

export function ProjectDetailsModule() {
  const { projectId } = useParams()
  const { activeOrganization } = useOrganization()
  const projectQuery = useProject(activeOrganization?.id ?? null, projectId)

  if (projectQuery.isLoading) return <ProjectDetailsSkeleton />
  if (!projectId || !activeOrganization) return <EmptyState description="Select an organization before viewing project details." title="Project unavailable" />
  if (projectQuery.error) {
    const error = parseApiError(projectQuery.error)
    if (error.statusCode === 404) return <EmptyState description="This project was not found in the selected organization, or it is no longer available." title="Project not found" />
    if (error.statusCode === 403) return <ErrorState error={error} title="You do not have access to this project" />
    return <ErrorState error={error} onRetry={() => { void projectQuery.refetch() }} title="Unable to load project details" />
  }
  if (!projectQuery.data) return <EmptyState description="This project is not currently available." title="Project unavailable" />

  return <ProjectDetailsContent
    isRefreshing={projectQuery.isFetching}
    onRefresh={() => { void projectQuery.refetch() }}
    organizationName={activeOrganization.name}
    project={projectQuery.data}
  />
}

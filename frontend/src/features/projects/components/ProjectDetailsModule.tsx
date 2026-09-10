import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { parseApiError } from '../../../lib/api/errors'
import { queryKeys } from '../../../lib/api/queryKeys'
import { useNotifications } from '../../../hooks/useNotifications'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useProject } from '../hooks/useProject'
import { deleteProject, updateProject } from '../services/projectService'
import type { Project, ProjectFormErrors, ProjectFormValues } from '../types/project'
import { buildProjectFormValues, formatProjectDate, updateProjectRequestFromValues, validateProjectForm } from '../utils/projectPresentation'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import { ProjectForm } from './ProjectForm'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { ProjectDocumentsSection } from './ProjectDocumentsSection'
import { ProjectAnalysisSection } from './ProjectAnalysisSection'
import { ProjectRecommendationsSection } from './ProjectRecommendationsSection'

interface ProjectMutationState {
  errors: ProjectFormErrors
  formError: string | null
  isSubmitting: boolean
}

function createInitialMutationState(): ProjectMutationState {
  return { errors: {}, formError: null, isSubmitting: false }
}

const futureSections = ['Tasks', 'Activity']

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
  onDelete,
  onEdit,
  onRefresh,
  organizationName,
  project,
  activeTab = 'overview',
  analysisDocumentId,
  onTabChange,
  onAnalysisDocumentChange,
  organizationId,
}: {
  activeTab?: 'overview' | 'documents' | 'analysis' | 'recommendations'
  isRefreshing?: boolean
  onDelete?: () => void
  onEdit?: () => void
  onRefresh?: () => void
  analysisDocumentId?: string | null
  onTabChange?: (tab: 'overview' | 'documents' | 'analysis' | 'recommendations') => void
  onAnalysisDocumentChange?: (documentId: string) => void
  organizationName: string
  organizationId?: string
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
        <div className="flex shrink-0 gap-3">
          {onEdit ? <Button onClick={onEdit} variant="secondary">Edit project</Button> : null}
          <Button aria-label="Refresh project details" disabled={isRefreshing} onClick={onRefresh} variant="secondary">
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          {onDelete ? <Button onClick={onDelete} variant="danger">Delete project</Button> : null}
        </div>
      </header>

      <nav aria-label="Project sections" className="overflow-x-auto border-b border-border-subtle">
        <ul className="flex min-w-max gap-1" role="list">
          {(['overview', 'documents', 'analysis', 'recommendations'] as const).map((tab) => <li key={tab}><button aria-current={activeTab === tab ? 'page' : undefined} className={activeTab === tab ? 'inline-flex border-b-2 border-primary-600 px-3 py-3 text-sm font-semibold text-primary-700' : 'inline-flex px-3 py-3 text-sm text-ink-600 hover:text-ink-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300'} onClick={() => onTabChange?.(tab)} type="button">{tab === 'overview' ? 'Overview' : tab === 'documents' ? 'Documents' : tab === 'analysis' ? 'AI Analysis' : 'Recommendations'}</button></li>)}
          {futureSections.map((section) => (
            <li key={section}>
              <span aria-label={`${section}: coming next`} className="inline-flex px-3 py-3 text-sm text-ink-500">{section}<span className="ml-2 text-xs">Coming next</span></span>
            </li>
          ))}
        </ul>
      </nav>

      {activeTab === 'documents' && organizationId ? <ProjectDocumentsSection organizationId={organizationId} projectId={project.id} /> : null}
      {activeTab === 'analysis' && organizationId ? <ProjectAnalysisSection onDocumentChange={onAnalysisDocumentChange} organizationId={organizationId} projectId={project.id} selectedDocumentId={analysisDocumentId ?? null} /> : null}
      {activeTab === 'recommendations' && organizationId ? <ProjectRecommendationsSection organizationId={organizationId} projectId={project.id} /> : null}
      {activeTab === 'overview' ? <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
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
      </div> : null}
    </div>
  )
}

function Metadata({ children, label }: { children: ReactNode; label: string }) {
  return <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-3"><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">{label}</dt><dd className="mt-2 text-sm font-medium text-ink-800">{children}</dd></div>
}

export function ProjectDetailsModule() {
  const { projectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeOrganization } = useOrganization()
  const notifications = useNotifications()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const projectQuery = useProject(activeOrganization?.id ?? null, projectId)
  const [isEditing, setIsEditing] = useState(false)
  const [mutationState, setMutationState] = useState<ProjectMutationState>(createInitialMutationState())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (projectQuery.isLoading) return <ProjectDetailsSkeleton />
  if (!projectId || !activeOrganization) return <EmptyState description="Select an organization before viewing project details." title="Project unavailable" />
  if (projectQuery.error) {
    const error = parseApiError(projectQuery.error)
    if (error.statusCode === 404) return <EmptyState description="This project was not found in the selected organization, or it is no longer available." title="Project not found" />
    if (error.statusCode === 403) return <ErrorState error={error} title="You do not have access to this project" />
    return <ErrorState error={error} onRetry={() => { void projectQuery.refetch() }} title="Unable to load project details" />
  }
  if (!projectQuery.data) return <EmptyState description="This project is not currently available." title="Project unavailable" />

  async function submitEditProject(values: ProjectFormValues) {
    const currentProject = projectQuery.data as Project
    const errors = validateProjectForm(values, currentProject)

    if (Object.keys(errors).length > 0) {
      setMutationState({ errors, formError: null, isSubmitting: false })
      return
    }

    const request = updateProjectRequestFromValues(currentProject, values)

    if (Object.keys(request).length === 0) {
      notifications.info({ message: 'The project already matches the current values.', title: 'No changes to save' })
      setIsEditing(false)
      setMutationState(createInitialMutationState())
      return
    }

    setMutationState({ errors: {}, formError: null, isSubmitting: true })

    try {
      await updateProject(currentProject.id, request)
      await projectQuery.refetch()
      setIsEditing(false)
      setMutationState(createInitialMutationState())
      notifications.success({ message: 'The project details were updated successfully.', title: 'Project updated' })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to update the project.'
      setMutationState({ errors: {}, formError: message, isSubmitting: false })
      notifications.error({ message, title: 'Project update failed' })
    }
  }

  async function confirmDeleteProject() {
    const currentProject = projectQuery.data as Project
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteProject(currentProject.id)
      if (activeOrganization) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(activeOrganization.id) }),
          queryClient.removeQueries({
            queryKey: queryKeys.projects.detail(activeOrganization.id, currentProject.id),
          }),
        ])
      }
      notifications.success({ message: `${currentProject.title} has been deleted.`, title: 'Project deleted' })
      setIsDeleteDialogOpen(false)
      navigate('/projects')
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to delete the project.'
      setDeleteError(message)
      notifications.error({ message, title: 'Project deletion failed' })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isEditing) {
    return (
      <ProjectForm
        formError={mutationState.formError}
        initialValues={buildProjectFormValues(projectQuery.data)}
        isSubmitting={mutationState.isSubmitting}
        mode="edit"
        onCancel={() => { setIsEditing(false); setMutationState(createInitialMutationState()) }}
        onSubmit={submitEditProject}
        project={projectQuery.data}
        validationErrors={mutationState.errors}
      />
    )
  }

  const activeTab = searchParams.get('tab') === 'documents'
    ? 'documents'
    : searchParams.get('tab') === 'analysis'
      ? 'analysis'
      : searchParams.get('tab') === 'recommendations'
        ? 'recommendations'
      : 'overview'

  function changeTab(tab: 'overview' | 'documents' | 'analysis' | 'recommendations') {
    const nextParams = new URLSearchParams(searchParams)
    if (tab === 'overview') {
      nextParams.delete('tab')
      nextParams.delete('documentId')
    } else nextParams.set('tab', tab)
    setSearchParams(nextParams)
  }

  function changeAnalysisDocument(documentId: string) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('documentId', documentId)
    setSearchParams(nextParams, { replace: true })
  }

  return <>
    <ProjectDetailsContent
      activeTab={activeTab}
      analysisDocumentId={searchParams.get('documentId')}
      isRefreshing={projectQuery.isFetching}
      onDelete={() => { setDeleteError(null); setIsDeleteDialogOpen(true) }}
      onEdit={() => setIsEditing(true)}
      onTabChange={changeTab}
      onAnalysisDocumentChange={changeAnalysisDocument}
      onRefresh={() => { void projectQuery.refetch() }}
      organizationName={activeOrganization.name}
      organizationId={activeOrganization.id}
      project={projectQuery.data}
    />
    <DeleteProjectDialog
      error={deleteError}
      isDeleting={isDeleting}
      onCancel={() => setIsDeleteDialogOpen(false)}
      onConfirm={() => { void confirmDeleteProject() }}
      open={isDeleteDialogOpen}
      project={isDeleteDialogOpen ? projectQuery.data : null}
    />
  </>
}

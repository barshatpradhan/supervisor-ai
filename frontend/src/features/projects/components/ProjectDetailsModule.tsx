import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Chip } from '../../../components/ui/Chip'
import { PageHeader } from '../../../components/ui/PageHeader'
import { PriorityTag } from '../../../components/ui/PriorityTag'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Tabs } from '../../../components/ui/Tabs'
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
import { ProjectDocumentsWorkspace } from './ProjectDocumentsWorkspace'
import { ProjectRecommendationsSection } from './ProjectRecommendationsSection'

interface ProjectMutationState {
  errors: ProjectFormErrors
  formError: string | null
  isSubmitting: boolean
}

function createInitialMutationState(): ProjectMutationState {
  return { errors: {}, formError: null, isSubmitting: false }
}

type ProjectTab = 'overview' | 'documents' | 'recommendations'

const projectTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { ai: true, id: 'recommendations', label: 'Recommendations' },
] as const

function ProjectDetailsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading project details" className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
        <div className="h-9 w-2/5 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className="h-11 animate-pulse rounded-control bg-surface-muted" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="h-72 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-72 animate-pulse rounded-card bg-surface-muted" />
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
  activeTab?: ProjectTab
  isRefreshing?: boolean
  onDelete?: () => void
  onEdit?: () => void
  onRefresh?: () => void
  analysisDocumentId?: string | null
  onTabChange?: (tab: ProjectTab) => void
  onAnalysisDocumentChange?: (documentId: string) => void
  organizationName: string
  organizationId?: string
  project: Project
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <>
            {onEdit ? <Button onClick={onEdit} variant="secondary">Edit project</Button> : null}
            <Button aria-label="Refresh project details" disabled={isRefreshing} onClick={onRefresh} variant="secondary">
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            {onDelete ? <Button onClick={onDelete} variant="danger">Delete project</Button> : null}
          </>
        }
        back={{ label: 'Projects', to: '/projects' }}
        meta={
          <>
            <StatusBadge status={project.status} />
            <PriorityTag priority={project.priority} />
          </>
        }
        subtitle={organizationName}
        title={project.title}
      />

      <Tabs idPrefix="project" label="Project sections" onChange={(tab) => onTabChange?.(tab)} tabs={projectTabs} value={activeTab} />

      <div aria-labelledby={`project-tab-${activeTab}`} id="project-panel" role="tabpanel">
        {activeTab === 'documents' && organizationId ? (
          <ProjectDocumentsWorkspace
            onSelectDocument={(documentId) => onAnalysisDocumentChange?.(documentId)}
            organizationId={organizationId}
            projectId={project.id}
            selectedDocumentId={analysisDocumentId ?? null}
          />
        ) : null}
        {activeTab === 'recommendations' && organizationId ? <ProjectRecommendationsSection organizationId={organizationId} projectId={project.id} /> : null}
        {activeTab === 'overview' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <div className="flex flex-col gap-6">
              <Card aria-labelledby="project-description-heading" className="flex flex-col gap-4">
                <CardHeader id="project-description-heading" title="Project overview" />
                <p className="body m-0 whitespace-pre-wrap text-text-primary">
                  {project.description?.trim() || 'No description has been added for this project.'}
                </p>
              </Card>
              <Card aria-labelledby="required-skills-heading" className="flex flex-col gap-4">
                <CardHeader id="required-skills-heading" title="Required skills" />
                {project.required_skills.length ? (
                  <ul aria-label="Required skills" className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {project.required_skills.map((skill) => <li key={skill}><Chip>{skill}</Chip></li>)}
                  </ul>
                ) : <p className="body m-0 text-text-secondary">No required skills have been recorded for this project.</p>}
              </Card>
            </div>
            <Card aria-labelledby="project-metadata-heading" className="flex flex-col gap-4">
              <CardHeader id="project-metadata-heading" title="Project metadata" />
              <dl className="m-0 grid gap-3">
                <Metadata label="Status"><StatusBadge status={project.status} /></Metadata>
                <Metadata label="Priority"><PriorityTag priority={project.priority} /></Metadata>
                <Metadata label="Created">{formatProjectDate(project.created_at)}</Metadata>
                <Metadata label="Last updated">{formatProjectDate(project.updated_at)}</Metadata>
              </dl>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Metadata({ children, label }: { children: ReactNode; label: string }) {
  return <div className="rounded-control border border-chart-grid bg-surface-inset p-3"><dt className="label text-text-secondary">{label}</dt><dd className="body m-0 mt-1.5 text-text-primary">{children}</dd></div>
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

  // The old "analysis" tab now lives inside Documents.
  const tabParam = searchParams.get('tab')
  const activeTab: ProjectTab =
    tabParam === 'documents' || tabParam === 'analysis'
      ? 'documents'
      : tabParam === 'recommendations'
        ? 'recommendations'
        : 'overview'

  function changeTab(tab: ProjectTab) {
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

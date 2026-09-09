import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { useNotifications } from '../../../hooks/useNotifications'
import { useProjects } from '../hooks/useProjects'
import { createProject } from '../services/projectService'
import type { ProjectFormErrors, ProjectFormValues } from '../types/project'
import { buildProjectFormValues, createProjectRequestFromValues, validateProjectForm } from '../utils/projectPresentation'
import { ProjectForm } from './ProjectForm'
import { ProjectList } from './ProjectList'

interface ProjectsModuleProps {
  organizationId: string | null
  organizationName: string
}

interface ProjectMutationState {
  errors: ProjectFormErrors
  formError: string | null
  isSubmitting: boolean
}

function createInitialMutationState(): ProjectMutationState {
  return { errors: {}, formError: null, isSubmitting: false }
}

export function ProjectsModule({ organizationId, organizationName }: ProjectsModuleProps) {
  const navigate = useNavigate()
  const notifications = useNotifications()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const projectsQuery = useProjects(organizationId)
  const projects = projectsQuery.data ?? []
  const [isCreating, setIsCreating] = useState(false)
  const [mutationState, setMutationState] = useState<ProjectMutationState>(createInitialMutationState())
  const visibleProjects = useMemo(() => {
    const loadedProjects = projectsQuery.data ?? []
    const normalizedSearch = search.trim().toLocaleLowerCase()
    if (!normalizedSearch) return loadedProjects
    return loadedProjects.filter((project) => `${project.title} ${project.description ?? ''}`.toLocaleLowerCase().includes(normalizedSearch))
  }, [projectsQuery.data, search])

  function updateSearch(value: string) {
    const nextParams = new URLSearchParams(searchParams)
    if (value.trim()) nextParams.set('search', value)
    else nextParams.delete('search')
    setSearchParams(nextParams, { replace: true })
  }

  function startCreateProject() {
    setMutationState(createInitialMutationState())
    setIsCreating(true)
  }

  function cancelCreateProject() {
    setMutationState(createInitialMutationState())
    setIsCreating(false)
  }

  async function submitCreateProject(values: ProjectFormValues) {
    const errors = validateProjectForm(values)

    if (Object.keys(errors).length > 0) {
      setMutationState({ errors, formError: null, isSubmitting: false })
      return
    }

    setMutationState({ errors: {}, formError: null, isSubmitting: true })

    try {
      const createdProject = await createProject(createProjectRequestFromValues(values))
      await projectsQuery.refetch()
      setIsCreating(false)
      setMutationState(createInitialMutationState())
      notifications.success({
        message: 'The project is now available in your workspace.',
        title: 'Project created',
      })
      navigate(`/projects/${createdProject.id}`)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to create the project.'
      setMutationState({ errors: {}, formError: message, isSubmitting: false })
      notifications.error({ message, title: 'Project creation failed' })
    }
  }

  if (projectsQuery.isLoading) return <LoadingState label="Loading projects…" />
  if (projectsQuery.error) return <ErrorState error={projectsQuery.error} onRetry={() => { void projectsQuery.refetch() }} title="Unable to load projects" />

  if (isCreating) {
    return (
      <ProjectForm
        formError={mutationState.formError}
        initialValues={buildProjectFormValues()}
        isSubmitting={mutationState.isSubmitting}
        mode="create"
        onCancel={cancelCreateProject}
        onSubmit={submitCreateProject}
        validationErrors={mutationState.errors}
      />
    )
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        actionLabel="Create project"
        description="Projects will appear here when they are added to this organization."
        onAction={startCreateProject}
        title="No projects yet"
      />
    )
  }

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-card p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-normal text-primary-700">Organization projects</p><h1 className="text-3xl font-bold text-ink-900">Projects</h1><p className="max-w-2xl text-sm leading-6 text-ink-600">{organizationName} has {projects.length} project{projects.length === 1 ? '' : 's'} available to review.</p></div>
        <div className="flex items-end gap-3">
          <Button disabled={projectsQuery.isFetching} onClick={() => { void projectsQuery.refetch() }} variant="secondary">{projectsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</Button>
          <Button onClick={startCreateProject}>New project</Button>
        </div>
      </section>
      <section className="grid gap-4"><FormField aria-label="Search projects" label="Search projects" onChange={(event) => updateSearch(event.target.value)} placeholder="Search project title or description" type="search" value={search} />
        {visibleProjects.length === 0 ? <EmptyState description="Try a different search term or clear search to view every project in this organization." onAction={() => updateSearch('')} actionLabel="Clear search" title="No projects match your search" /> : <ProjectList projects={visibleProjects} />}
      </section>
    </div>
  )
}

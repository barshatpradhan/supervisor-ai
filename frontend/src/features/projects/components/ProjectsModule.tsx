import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { useProjects } from '../hooks/useProjects'
import { ProjectList } from './ProjectList'

interface ProjectsModuleProps {
  organizationId: string | null
  organizationName: string
}

export function ProjectsModule({ organizationId, organizationName }: ProjectsModuleProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const projectsQuery = useProjects(organizationId)
  const projects = projectsQuery.data ?? []
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

  if (projectsQuery.isLoading) return <LoadingState label="Loading projects…" />
  if (projectsQuery.error) return <ErrorState error={projectsQuery.error} onRetry={() => { void projectsQuery.refetch() }} title="Unable to load projects" />
  if (projects.length === 0) return <EmptyState description="Projects will appear here when they are added to this organization." title="No projects yet" />

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-card p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-normal text-primary-700">Organization projects</p><h1 className="text-3xl font-bold text-ink-900">Projects</h1><p className="max-w-2xl text-sm leading-6 text-ink-600">{organizationName} has {projects.length} project{projects.length === 1 ? '' : 's'} available to review.</p></div>
        <div className="flex items-end gap-3"><Button disabled={projectsQuery.isFetching} onClick={() => { void projectsQuery.refetch() }} variant="secondary">{projectsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</Button></div>
      </section>
      <section className="grid gap-4"><FormField aria-label="Search projects" label="Search projects" onChange={(event) => updateSearch(event.target.value)} placeholder="Search project title or description" type="search" value={search} />
        {visibleProjects.length === 0 ? <EmptyState description="Try a different search term or clear search to view every project in this organization." onAction={() => updateSearch('')} actionLabel="Clear search" title="No projects match your search" /> : <ProjectList projects={visibleProjects} />}
      </section>
    </div>
  )
}

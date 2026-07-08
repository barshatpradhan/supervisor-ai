import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { ProjectList } from './ProjectList'
import { ProjectPanel } from './ProjectPanel'
import { useProjectManager } from '../hooks/useProjectManager'

export function ProjectsModule() {
  const manager = useProjectManager()

  if (manager.isListLoading && !manager.hasProjects) {
    return <LoadingState label="Loading projects" />
  }

  if (manager.listError && !manager.hasProjects) {
    return (
      <ErrorState
        error={manager.listError}
        onRetry={manager.retryList}
        title="Unable to load projects"
      />
    )
  }

  if (!manager.hasProjects && !manager.isCreateMode) {
    return (
      <EmptyState
        actionLabel="Create project"
        description="Create your first project to start organizing work, priorities, and delivery timelines."
        onAction={manager.startCreateProject}
        title="No projects yet"
      />
    )
  }

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            Supervisor workspace
          </p>
          <h1 className="text-3xl font-bold tracking-normal text-ink-900">
            Projects
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-600">
            Track project definitions, priorities, and delivery context before
            task planning and assignment begin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {manager.isListRefreshing ? (
            <span className="text-sm text-ink-500">Refreshing list…</span>
          ) : null}
          <Button onClick={manager.startCreateProject}>New project</Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          {manager.listError && manager.hasProjects ? (
            <ErrorState
              error={manager.listError}
              onRetry={manager.retryList}
              title="Project list refresh failed"
            />
          ) : null}

          <ProjectList
            onSelect={manager.selectProject}
            projects={manager.projectList}
            selectedProjectId={manager.selectedProjectId}
          />
        </div>

        <ProjectPanel manager={manager} />
      </div>
    </div>
  )
}

import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { ProjectForm } from './ProjectForm'
import { ProjectDetailCard } from './ProjectDetailCard'
import type { useProjectManager } from '../hooks/useProjectManager'

interface ProjectPanelProps {
  manager: ReturnType<typeof useProjectManager>
}

export function ProjectPanel({ manager }: ProjectPanelProps) {
  if (manager.isCreateMode) {
    return (
      <ProjectForm
        formError={manager.mutationState.formError}
        initialValues={manager.getProjectFormValues()}
        isSubmitting={manager.mutationState.isSubmitting}
        key="create-project"
        mode="create"
        onSubmit={manager.submitCreateProject}
        validationErrors={manager.mutationState.errors}
      />
    )
  }

  if (!manager.selectedProjectId) {
    return (
      <EmptyState
        actionLabel="Create project"
        description="Select a project from the list to inspect its details, or create a new project to begin planning."
        onAction={manager.startCreateProject}
        title="No project selected"
      />
    )
  }

  if (manager.isDetailLoading) {
    return <LoadingState label="Loading project details" />
  }

  if (manager.projectError || !manager.selectedProject) {
    return (
      <ErrorState
        error={manager.projectError}
        onRetry={manager.retrySelectedProject}
        title="Unable to load this project"
      />
    )
  }

  if (manager.isEditMode) {
    return (
      <ProjectForm
        formError={manager.mutationState.formError}
        initialValues={manager.getProjectFormValues(manager.selectedProject)}
        isSubmitting={manager.mutationState.isSubmitting}
        key={`edit-project-${manager.selectedProject.id}`}
        mode="edit"
        onCancel={manager.cancelPanel}
        onSubmit={manager.submitUpdateProject}
        project={manager.selectedProject}
        validationErrors={manager.mutationState.errors}
      />
    )
  }

  return (
    <ProjectDetailCard
      documentManager={manager.documentManager}
      onEdit={manager.startEditProject}
      project={manager.selectedProject}
    />
  )
}

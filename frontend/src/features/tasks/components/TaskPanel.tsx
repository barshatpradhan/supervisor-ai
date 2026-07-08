import { EmptyState } from '../../../components/shared/EmptyState'
import { TaskDetailCard } from './TaskDetailCard'
import { TaskForm } from './TaskForm'
import { TaskProgressForm } from './TaskProgressForm'
import type { useTaskManager } from '../hooks/useTaskManager'

interface TaskPanelProps {
  manager: ReturnType<typeof useTaskManager>
}

export function TaskPanel({ manager }: TaskPanelProps) {
  if (manager.isCreateMode) {
    return (
      <TaskForm
        formError={manager.taskMutationState.formError}
        initialValues={manager.getTaskFormValues(manager.projectList[0]?.id)}
        isSubmitting={manager.taskMutationState.isSubmitting}
        onCancel={manager.cancelPanel}
        onSubmit={manager.submitCreateTask}
        projects={manager.projectList}
        validationErrors={manager.taskMutationState.errors}
      />
    )
  }

  if (!manager.selectedTask) {
    return (
      <EmptyState
        actionLabel={manager.canManageTasks ? 'Create task' : undefined}
        description="Select a task from the list to inspect its details and current delivery state."
        onAction={manager.canManageTasks ? manager.startCreateTask : undefined}
        title="No task selected"
      />
    )
  }

  if (manager.isProgressMode) {
    return (
      <TaskProgressForm
        formError={manager.taskProgressMutationState.formError}
        initialValues={manager.getTaskProgressFormValues(manager.selectedTask)}
        isSubmitting={manager.taskProgressMutationState.isSubmitting}
        onCancel={manager.cancelPanel}
        onSubmit={manager.submitTaskProgress}
        task={manager.selectedTask}
        validationErrors={manager.taskProgressMutationState.errors}
      />
    )
  }

  return (
    <TaskDetailCard
      canManageTasks={manager.canManageTasks}
      canUpdateProgress={manager.canUpdateProgress}
      onCreateTask={manager.startCreateTask}
      onUpdateProgress={manager.startProgressUpdate}
      task={manager.selectedTask}
    />
  )
}

import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { SkeletonPage } from '../../../components/shared/SkeletonPage'
import { Button } from '../../../components/ui/Button'
import { useTaskManager } from '../hooks/useTaskManager'
import { TaskList } from './TaskList'
import { TaskPanel } from './TaskPanel'

export function TasksModule() {
  const manager = useTaskManager()

  if (manager.isPageLoading && !manager.hasTasks) {
    return <SkeletonPage tableColumns={7} tableRows={5} titleWidth="w-44" />
  }

  if (manager.pageError && !manager.hasTasks) {
    return (
      <ErrorState
        error={manager.pageError}
        onRetry={manager.retryPage}
        title="Unable to load tasks"
      />
    )
  }

  if (manager.canManageTasks && manager.projectList.length === 0) {
    return (
      <EmptyState
        description="Create a project first, then return here to create and manage tasks inside it."
        title="No projects available for tasks"
      />
    )
  }

  if (!manager.hasTasks && !manager.isCreateMode) {
    return (
      <EmptyState
        actionLabel={manager.canManageTasks ? 'Create task' : undefined}
        description={
          manager.canManageTasks
            ? 'Create your first task to define scoped work inside a project.'
            : 'Tasks assigned to you will appear here once your supervisor begins assigning work.'
        }
        onAction={manager.canManageTasks ? manager.startCreateTask : undefined}
        title={manager.canManageTasks ? 'No tasks yet' : 'No assigned tasks yet'}
      />
    )
  }

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            {manager.canManageTasks ? 'Supervisor workspace' : 'Employee workspace'}
          </p>
          <h1 className="text-3xl font-bold tracking-normal text-ink-900">Tasks</h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-600">
            {manager.canManageTasks
              ? 'Review task status, delivery effort, and assignment state across active work.'
              : 'Track your assigned work, update progress, and keep delivery status current.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {manager.isRefreshing ? (
            <span className="text-sm text-ink-500">Refreshing list...</span>
          ) : null}
          {manager.canManageTasks ? (
            <Button onClick={manager.startCreateTask}>New task</Button>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          {manager.pageError && manager.hasTasks ? (
            <ErrorState
              error={manager.pageError}
              onRetry={manager.retryPage}
              title="Task list refresh failed"
            />
          ) : null}

          <TaskList
            onSelect={manager.selectTask}
            selectedTaskId={manager.selectedTaskId}
            tasks={manager.taskList}
          />
        </div>

        <TaskPanel manager={manager} />
      </div>
    </div>
  )
}

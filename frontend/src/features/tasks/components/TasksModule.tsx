import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StackedBar } from '../../../components/charts/StackedBar'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Dialog } from '../../../components/ui/Dialog'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Segmented } from '../../../components/ui/Segmented'
import { StateBlock } from '../../../components/ui/StateBlock'
import { AskAboutTaskLink } from '../../messaging/components/AskAboutTaskLink'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useEmployeeNames } from '../hooks/useEmployeeNames'
import { useTaskManager } from '../hooks/useTaskManager'
import { taskStatusLabels } from '../utils/taskPresentation'
import { boardStatuses, getTaskProgress, resolveAssigneeName, statusColorTokens } from '../utils/taskBoard'
import { TaskBoard } from './TaskBoard'
import type { TaskBoardCard } from './TaskBoard'
import { TaskForm } from './TaskForm'

type TaskFilter = 'all' | 'assigned' | 'unassigned'

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'unassigned', label: 'Unassigned' },
] as const

export function TasksModule() {
  const manager = useTaskManager()
  const { activeOrganization } = useOrganization()
  const employeeNames = useEmployeeNames(manager.canManageTasks)
  const [filter, setFilter] = useState<TaskFilter>('all')

  const cards = useMemo<TaskBoardCard[]>(
    () =>
      manager.taskList
        .filter((task) => filter === 'all' || (filter === 'assigned') === Boolean(task.assigned_employee_id))
        .map((task) => ({
          assigneeName: resolveAssigneeName(task, employeeNames),
          estimatedHours: task.estimated_hours,
          id: task.id,
          priority: task.priority,
          progress: getTaskProgress(task),
          project: task.projectLabel,
          projectId: task.project_id,
          status: task.status,
          title: task.title,
          updatedAt: task.updated_at,
        })),
    [employeeNames, filter, manager.taskList],
  )

  const statusMix = boardStatuses.map((status) => ({
    color: statusColorTokens[status],
    name: taskStatusLabels[status],
    value: cards.filter((card) => card.status === status).length,
  }))

  const newTaskButton = manager.canManageTasks ? (
    <Button className="gap-2" disabled={manager.projectList.length === 0} onClick={manager.startCreateTask}>
      <Plus aria-hidden="true" size={16} />
      New task
    </Button>
  ) : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <>
            {manager.canManageTasks && manager.hasTasks ? (
              <Segmented label="Show tasks" onChange={setFilter} options={filterOptions} value={filter} />
            ) : null}
            {manager.isRefreshing ? <span className="helper text-text-tertiary">Refreshing…</span> : null}
            {newTaskButton}
          </>
        }
        title="Tasks"
      />

      {manager.isPageLoading && !manager.hasTasks ? (
        <Card><StateBlock kind="loading" title="Loading tasks" /></Card>
      ) : manager.pageError && !manager.hasTasks ? (
        <Card>
          <StateBlock action={<Button onClick={manager.retryPage} variant="secondary">Retry</Button>} kind="error" title="Tasks could not be loaded">
            Check your connection, then try again.
          </StateBlock>
        </Card>
      ) : manager.canManageTasks && manager.projectList.length === 0 ? (
        <Card><StateBlock title="No projects yet">Create a project first, then add tasks to it.</StateBlock></Card>
      ) : !manager.hasTasks ? (
        <Card>
          <StateBlock action={newTaskButton} title={manager.canManageTasks ? 'No tasks yet' : 'No assigned tasks yet'}>
            {manager.canManageTasks
              ? 'Create the first task to plan work inside a project.'
              : 'Tasks assigned to you will appear here.'}
          </StateBlock>
        </Card>
      ) : (
        <>
          <Card aria-label="Status mix" padding="sm">
            <StackedBar data={statusMix} />
          </Card>
          <TaskBoard
            cardAction={
              // Employees ask about their own tasks in the project channel; admins and supervisors
              // use "Ask for update" in chat instead.
              manager.canManageTasks
                ? undefined
                : (card) => (
                    <AskAboutTaskLink
                      organizationId={activeOrganization?.id ?? null}
                      projectId={card.projectId}
                      taskId={card.id}
                      taskTitle={card.title}
                    />
                  )
            }
            tasks={cards}
          />
        </>
      )}

      <DialogPrimitive.Root
        onOpenChange={(open) => {
          if (!open) manager.cancelPanel()
        }}
        open={manager.isCreateMode}
      >
        <Dialog description="You can assign the task after it is created." title="New task">
          <TaskForm
            embedded
            formError={manager.taskMutationState.formError}
            initialValues={manager.getTaskFormValues(manager.projectList[0]?.id)}
            isSubmitting={manager.taskMutationState.isSubmitting}
            onCancel={manager.cancelPanel}
            onSubmit={manager.submitCreateTask}
            projects={manager.projectList}
            validationErrors={manager.taskMutationState.errors}
          />
        </Dialog>
      </DialogPrimitive.Root>
    </div>
  )
}

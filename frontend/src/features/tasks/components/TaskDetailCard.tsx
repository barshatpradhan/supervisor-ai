import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import type { TaskDisplay } from '../types/task'
import { formatEstimatedHours, formatTaskDate } from '../utils/taskPresentation'
import { TaskAssignmentSection } from './TaskAssignmentSection'
import { TaskStatusBadge } from './TaskStatusBadge'
import type { useAssignableEmployees } from '../hooks/useAssignableEmployees'

interface TaskDetailCardProps {
  assignmentError: string | null
  assignmentSelection: string
  canManageTasks: boolean
  canSubmitAssignment: boolean
  canUpdateProgress: boolean
  employeeDirectory: ReturnType<typeof useAssignableEmployees>
  isAssigningTask: boolean
  onAssignTask: () => Promise<void>
  onAssignmentSelectionChange: (employeeId: string) => void
  onCreateTask: () => void
  onUpdateProgress: () => void
  task: TaskDisplay
}

export function TaskDetailCard({
  assignmentError,
  assignmentSelection,
  canManageTasks,
  canSubmitAssignment,
  canUpdateProgress,
  employeeDirectory,
  isAssigningTask,
  onAssignTask,
  onAssignmentSelectionChange,
  onCreateTask,
  onUpdateProgress,
  task,
}: TaskDetailCardProps) {
  return (
    <Card>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Task details
            </p>
            <h2 className="text-2xl font-bold text-ink-900">{task.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusBadge kind="status" value={task.status} />
              <TaskStatusBadge kind="priority" value={task.priority} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManageTasks ? (
              <Button onClick={onCreateTask} variant="secondary">
                New task
              </Button>
            ) : null}
            {canUpdateProgress ? (
              <Button onClick={onUpdateProgress}>Update progress</Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
          <p className="text-sm font-semibold text-ink-900">Description</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {task.description?.trim() || 'No description has been added for this task.'}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
              Project
            </dt>
            <dd className="mt-2 text-sm font-medium text-ink-800">{task.projectLabel}</dd>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
              Assigned employee
            </dt>
            <dd className="mt-2 text-sm font-medium text-ink-800">
              {task.assignedEmployeeLabel}
            </dd>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
              Estimated hours
            </dt>
            <dd className="mt-2 text-sm font-medium text-ink-800">
              {formatEstimatedHours(task.estimated_hours)}
            </dd>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
              Assigned date
            </dt>
            <dd className="mt-2 text-sm font-medium text-ink-800">
              {formatTaskDate(task.assigned_at)}
            </dd>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
              Completion date
            </dt>
            <dd className="mt-2 text-sm font-medium text-ink-800">
              {formatTaskDate(task.completed_at)}
            </dd>
          </div>
        </dl>

        {canManageTasks ? (
          <TaskAssignmentSection
            assignmentError={assignmentError}
            canSubmitAssignment={canSubmitAssignment}
            directory={employeeDirectory}
            isSubmitting={isAssigningTask}
            onAssign={onAssignTask}
            onSelectionChange={onAssignmentSelectionChange}
            selectedEmployeeId={assignmentSelection}
            task={task}
          />
        ) : null}
      </div>
    </Card>
  )
}

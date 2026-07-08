import { Card } from '../../../components/ui/Card'
import type { TaskDisplay } from '../types/task'
import { formatEstimatedHours, formatTaskDate } from '../utils/taskPresentation'
import { TaskStatusBadge } from './TaskStatusBadge'

interface TaskListProps {
  onSelect: (taskId: string) => void
  selectedTaskId: string | null
  tasks: TaskDisplay[]
}

export function TaskList({ onSelect, selectedTaskId, tasks }: TaskListProps) {
  return (
    <Card className="p-0">
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="text-lg font-bold text-ink-900">Task list</h2>
        <p className="mt-1 text-sm text-ink-600">
          Review task status, assignment, and delivery effort in one place.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-surface-card-alt/70">
            <tr className="text-left">
              {[
                'Title',
                'Project',
                'Assigned employee',
                'Priority',
                'Status',
                'Estimated hours',
                'Assigned date',
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-normal text-ink-500"
                  scope="col"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {tasks.map((task) => {
              const isSelected = selectedTaskId === task.id

              return (
                <tr
                  key={task.id}
                  className={isSelected ? 'bg-glass-tinted' : 'hover:bg-surface-muted/60'}
                >
                  <td className="px-4 py-3 align-top">
                    <button
                      aria-label={`View task ${task.title}`}
                      className="text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
                      onClick={() => onSelect(task.id)}
                      type="button"
                    >
                      <span className="block font-semibold text-ink-900">{task.title}</span>
                      <span className="mt-1 block max-w-xs text-sm text-ink-600">
                        {task.description?.trim() || 'No task description has been added.'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-ink-700">{task.projectLabel}</td>
                  <td className="px-4 py-3 align-top text-sm text-ink-700">
                    {task.assignedEmployeeLabel}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <TaskStatusBadge kind="priority" value={task.priority} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <TaskStatusBadge kind="status" value={task.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-ink-700">
                    {formatEstimatedHours(task.estimated_hours)}
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-ink-700">
                    {formatTaskDate(task.assigned_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

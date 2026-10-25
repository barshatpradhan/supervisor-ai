import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { StateBlock } from '../../../components/ui/StateBlock'
import { formatOrganizationRole } from '../../organizations/utils/organizationPresentation'
import { useUnassignableOpenTasks } from '../hooks/useTeamAdmin'

/**
 * Open tasks left with someone who can no longer be assigned work: a suspended member, or one whose
 * role changed while a task was being assigned. Hidden when there are none. Admins only.
 */
export function UnassignableTasksCard({ organizationId }: { organizationId: string }) {
  const tasksQuery = useUnassignableOpenTasks(organizationId)
  const tasks = tasksQuery.data ?? []

  if (tasksQuery.isLoading || (!tasksQuery.error && tasks.length === 0)) return null

  return (
    <Card aria-labelledby="unassignable-tasks-title" className="flex flex-col gap-3">
      <CardHeader
        helper="Their assignee can no longer take work. Open each task to assign someone else."
        id="unassignable-tasks-title"
        title="Tasks that need a new assignee"
      />
      {tasksQuery.error ? (
        <StateBlock action={<Button onClick={() => { void tasksQuery.refetch() }} variant="secondary">Retry</Button>} compact kind="error">
          These tasks could not be loaded.
        </StateBlock>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {tasks.map((task) => (
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-chart-grid p-3" key={task.taskId}>
              <div className="min-w-0">
                <Link className="body-strong text-primary-700 underline" to={`/tasks/${task.taskId}`}>{task.taskTitle}</Link>
                <p className="helper m-0 text-text-tertiary">{task.projectTitle}</p>
              </div>
              <span className="helper text-text-secondary">
                {task.employeeName} ·{' '}
                {task.memberStatus === 'active' && task.memberRole ? `now ${formatOrganizationRole(task.memberRole).toLowerCase()}` : task.memberStatus ?? 'no longer a member'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

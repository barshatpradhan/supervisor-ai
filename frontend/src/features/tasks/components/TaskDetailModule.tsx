import { useEffect, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Chip } from '../../../components/ui/Chip'
import { PageHeader } from '../../../components/ui/PageHeader'
import { PriorityTag } from '../../../components/ui/PriorityTag'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { AskAboutTaskLink } from '../../messaging/components/AskAboutTaskLink'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useAuth } from '../../auth/hooks/useAuth'
import { useEmployeeAvatars, useEmployeeNames } from '../hooks/useEmployeeNames'
import { useTaskManager } from '../hooks/useTaskManager'
import { formatHours, formatShortDate, getTaskProgress, resolveAssigneeAvatar, resolveAssigneeName } from '../utils/taskBoard'
import { SuggestedOwnersPanel } from './SuggestedOwnersPanel'
import { TaskAssignmentSection } from './TaskAssignmentSection'
import { TaskProgressForm } from './TaskProgressForm'
import { TaskProgressTimeline } from './TaskProgressTimeline'

const back = { label: 'Tasks', to: '/tasks' }

function DetailItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div>
      <dt className="label text-text-secondary">{label}</dt>
      <dd className="m-0 mt-1 text-text-primary">{children}</dd>
    </div>
  )
}

export function TaskDetailModule() {
  const { taskId = null } = useParams()
  const { activeOrganization } = useOrganization()
  const manager = useTaskManager(taskId)
  const employeeNames = useEmployeeNames(manager.canManageTasks)
  const employeeAvatars = useEmployeeAvatars(manager.canManageTasks)
  const ownAvatar = useAuth().user?.avatarVariant ?? null
  const task = manager.taskList.find((entry) => entry.id === taskId) ?? null

  // /tasks/:id?update=progress (the "Update progress" link on a chat progress request) opens the
  // existing progress form once, subject to the same permission check as the button.
  const [searchParams, setSearchParams] = useSearchParams()
  const wantsProgressUpdate = searchParams.get('update') === 'progress'
  const { canUpdateSelectedTask, isProgressMode, startProgressUpdate } = manager
  useEffect(() => {
    if (!wantsProgressUpdate || !task) return
    if (canUpdateSelectedTask && !isProgressMode) startProgressUpdate()
    setSearchParams((params) => {
      params.delete('update')
      return params
    }, { replace: true })
  }, [canUpdateSelectedTask, isProgressMode, setSearchParams, startProgressUpdate, task, wantsProgressUpdate])

  if (manager.isPageLoading && !manager.hasTasks) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader back={back} title="Task" />
        <Card><StateBlock kind="loading" title="Loading task" /></Card>
      </div>
    )
  }

  if (manager.pageError && !manager.hasTasks) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader back={back} title="Task" />
        <Card>
          <StateBlock action={<Button onClick={manager.retryPage} variant="secondary">Retry</Button>} kind="error" title="This task could not be loaded">
            Check your connection, then try again.
          </StateBlock>
        </Card>
      </div>
    )
  }

  if (!task || manager.selectedTask?.id !== task.id) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader back={back} title="Task not found" />
        <Card>
          <StateBlock action={<Link className="label text-text-link" to="/tasks">Back to tasks</Link>}>
            This task doesn't exist in this workspace, or you don't have access to it.
          </StateBlock>
        </Card>
      </div>
    )
  }

  const assigneeName = resolveAssigneeName(task, employeeNames)
  const assigneeAvatar = resolveAssigneeAvatar(task, employeeNames, employeeAvatars, ownAvatar)
  const progress = getTaskProgress(task)
  const project = manager.projectList.find((entry) => entry.id === task.project_id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          !manager.canManageTasks || (manager.canUpdateSelectedTask && !manager.isProgressMode) ? (
          <>
            {!manager.canManageTasks ? (
              <AskAboutTaskLink
                organizationId={activeOrganization?.id ?? null}
                projectId={task.project_id}
                taskId={task.id}
                taskTitle={task.title}
              />
            ) : null}
            {manager.canUpdateSelectedTask && !manager.isProgressMode ? (
              <Button onClick={manager.startProgressUpdate}>Update progress</Button>
            ) : null}
          </>
          ) : null
        }
        back={back}
        meta={
          <>
            <StatusBadge status={task.status} />
            <PriorityTag priority={task.priority} />
          </>
        }
        title={task.title}
      />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-6">
          <Card aria-labelledby="task-details-title" className="flex flex-col gap-4">
            <CardHeader id="task-details-title" title="Details" />
            <p className="body m-0 whitespace-pre-wrap text-text-primary">
              {task.description?.trim() || 'No description yet.'}
            </p>
            <dl className="m-0 grid gap-4 rounded-control border border-chart-grid bg-surface-inset p-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              <DetailItem label="Project">
                <span className="body-strong">{task.projectLabel}</span>
              </DetailItem>
              <DetailItem label="Owner">
                <span className="inline-flex items-center gap-2">
                  <Avatar name={assigneeName} size={24} variant={assigneeAvatar} />
                  <span className="body-strong">{assigneeName ?? 'Unassigned'}</span>
                </span>
              </DetailItem>
              <DetailItem label="Estimate">
                <span className="num-sm">{formatHours(task.estimated_hours)}</span>
              </DetailItem>
              <DetailItem label="Assigned">
                <span className="num-sm">{formatShortDate(task.assigned_at)}</span>
              </DetailItem>
              {task.completed_at ? (
                <DetailItem label="Completed">
                  <span className="num-sm">{formatShortDate(task.completed_at)}</span>
                </DetailItem>
              ) : null}
            </dl>
            {project && project.required_skills.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="label text-text-secondary">Project skills</span>
                <div className="flex flex-wrap gap-2">
                  {project.required_skills.map((skill) => <Chip key={skill}>{skill}</Chip>)}
                </div>
              </div>
            ) : null}
          </Card>

          {manager.isProgressMode ? (
            <TaskProgressForm
              formError={manager.taskProgressMutationState.formError}
              initialValues={manager.getTaskProgressFormValues(task)}
              isSubmitting={manager.taskProgressMutationState.isSubmitting}
              onCancel={manager.cancelPanel}
              onSubmit={manager.submitTaskProgress}
              task={task}
              validationErrors={manager.taskProgressMutationState.errors}
            />
          ) : (
            <Card aria-labelledby="task-progress-title" className="flex flex-col gap-4">
              <CardHeader id="task-progress-title" title="Progress" />
              <ProgressBar label="Task progress" tone={task.status === 'blocked' ? 'bad' : task.status === 'completed' ? 'good' : 'primary'} value={progress} />
              <TaskProgressTimeline
                canComment={manager.canManageTasks && task.assigned_employee_id !== null}
                commentError={manager.taskCommentMutationState.formError}
                isPostingComment={manager.taskCommentMutationState.isSubmitting}
                onPostComment={manager.submitSupervisorComment}
                task={task}
              />
            </Card>
          )}
        </div>

        {manager.canManageTasks && activeOrganization ? (
          <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-6">
            <SuggestedOwnersPanel onAssigned={manager.retryPage} organizationId={activeOrganization.id} task={task} />
            <details className="group rounded-card border border-border-default bg-surface-card shadow-card">
              <summary className="section-title flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-text-primary [&::-webkit-details-marker]:hidden">
                Choose an owner yourself
                <ChevronDown aria-hidden="true" className="text-text-secondary transition group-open:rotate-180" size={18} />
              </summary>
              <div className="border-t border-border-subtle px-5 pb-5 pt-4">
                <TaskAssignmentSection
                  assignmentError={manager.assignmentMutationState.formError}
                  canSubmitAssignment={manager.canSubmitAssignment}
                  directory={manager.assignableEmployeesQuery}
                  isSubmitting={manager.assignmentMutationState.isSubmitting}
                  onAssign={manager.submitTaskAssignment}
                  onSelectionChange={manager.setAssignmentSelection}
                  selectedEmployeeId={manager.assignmentSelection}
                  task={{ ...task, assignedEmployeeLabel: assigneeName ?? 'Unassigned' }}
                />
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </div>
  )
}

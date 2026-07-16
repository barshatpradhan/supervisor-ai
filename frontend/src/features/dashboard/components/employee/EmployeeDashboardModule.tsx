import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../../../components/shared/EmptyState'
import { ErrorState } from '../../../../components/shared/ErrorState'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { TaskStatusBadge } from '../../../tasks/components/TaskStatusBadge'
import {
  formatEstimatedHours,
  formatTaskDate,
} from '../../../tasks/utils/taskPresentation'
import { useEmployeeDashboard } from '../../hooks/useEmployeeDashboard'
import type { EmployeeDashboardAssignment } from '../../types/dashboard'
import {
  formatDashboardDate,
  formatDashboardDateOrFallback,
  formatDashboardHours,
  formatDashboardPercent,
  formatDashboardScore,
  formatEmploymentType,
  formatLatestProgressStatus,
  getAvailabilityTone,
  getWorkloadTone,
} from '../../utils/dashboardPresentation'
import { EmployeeDashboardSkeleton } from './EmployeeDashboardSkeleton'

function SummaryCard({
  description,
  title,
  value,
}: {
  description: string
  title: string
  value: string
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-ink-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink-600">{description}</p>
    </Card>
  )
}

function SectionCard({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <Card>
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

function ProgressMeter({
  label,
  tone,
  value,
}: {
  label: string
  tone: string
  value: number
}) {
  const normalizedValue = Math.max(0, Math.min(100, value))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-800">{label}</span>
        <span className="text-sm text-ink-600">{formatDashboardPercent(normalizedValue)}</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={normalizedValue}
        className="h-3 rounded-full bg-surface-canvas-alt"
        role="progressbar"
      >
        <div
          aria-hidden="true"
          className={['h-3 rounded-full transition-[width]', tone].join(' ')}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  )
}

function AssignmentLink({ taskId }: { taskId: string }) {
  return (
    <Link
      className="text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
      state={{ selectedTaskId: taskId }}
      to="/tasks"
    >
      View task details
    </Link>
  )
}

function AssignmentCard({
  assignment,
}: {
  assignment: EmployeeDashboardAssignment
}) {
  return (
    <article className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink-900">{assignment.title}</h3>
            <TaskStatusBadge kind="status" value={assignment.status} />
            <TaskStatusBadge kind="priority" value={assignment.priority} />
          </div>
          <p className="text-sm text-ink-600">{assignment.project_title}</p>
          <p className="text-sm leading-6 text-ink-600">
            {assignment.description?.trim() || 'No task description has been added.'}
          </p>
        </div>

        <div className="flex shrink-0 items-start">
          <AssignmentLink taskId={assignment.task_id} />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Estimated effort
          </dt>
          <dd className="mt-2 text-sm font-semibold text-ink-900">
            {formatEstimatedHours(assignment.estimated_hours)}
          </dd>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Current progress
          </dt>
          <dd className="mt-2 text-sm font-semibold text-ink-900">
            {formatDashboardPercent(assignment.current_progress_percentage)}
          </dd>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Latest progress status
          </dt>
          <dd className="mt-2 text-sm font-semibold text-ink-900">
            {formatLatestProgressStatus(assignment.latest_progress_status)}
          </dd>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
          <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Last progress update
          </dt>
          <dd className="mt-2 text-sm font-semibold text-ink-900">
            {formatDashboardDateOrFallback(assignment.last_progress_at, 'No update yet')}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <ProgressMeter
          label={`${assignment.title} progress`}
          tone="bg-primary-600"
          value={assignment.current_progress_percentage}
        />
        <div className="text-sm text-ink-500">
          <p>Assigned {formatTaskDate(assignment.assigned_at)}</p>
        </div>
      </div>

      {assignment.latest_progress_notes ? (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-card p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">
            Latest notes
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-700">{assignment.latest_progress_notes}</p>
        </div>
      ) : null}
    </article>
  )
}

function CompactTaskList({
  emptyDescription,
  emptyTitle,
  items,
}: {
  emptyDescription: string
  emptyTitle: string
  items: EmployeeDashboardAssignment[]
}) {
  if (items.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />
  }

  return (
    <div className="space-y-3">
      {items.map((task) => (
        <div
          className="rounded-lg border border-border-subtle bg-surface-card-alt p-4"
          key={task.task_id}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink-900">{task.title}</p>
                <TaskStatusBadge kind="status" value={task.status} />
              </div>
                <p className="text-sm text-ink-600">
                    {task.project_title} - {formatDashboardPercent(task.current_progress_percentage)}
                  </p>
            </div>
            <AssignmentLink taskId={task.task_id} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmployeeDashboardModule() {
  const dashboardQuery = useEmployeeDashboard()

  if (dashboardQuery.isLoading) {
    return <EmployeeDashboardSkeleton />
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <ErrorState
        error={dashboardQuery.error}
        onRetry={() => {
          void dashboardQuery.refetch()
        }}
        title="Unable to load the employee dashboard"
      />
    )
  }

  const dashboard = dashboardQuery.data
  const summaryCards = [
    {
      description: 'Tasks currently assigned to you across active and completed work.',
      title: 'Assigned tasks',
      value: String(dashboard.workSummary.assigned_tasks),
    },
    {
      description: 'Tasks actively moving forward right now.',
      title: 'In-progress tasks',
      value: String(dashboard.workSummary.in_progress_tasks),
    },
    {
      description: 'Tasks blocked and needing attention before work can continue.',
      title: 'Blocked tasks',
      value: String(dashboard.workSummary.blocked_tasks),
    },
    {
      description: 'Tasks you have already completed.',
      title: 'Completed tasks',
      value: String(dashboard.workSummary.completed_tasks),
    },
    {
      description: 'Your configured weekly working capacity.',
      title: 'Weekly capacity',
      value: formatDashboardHours(dashboard.workSummary.weekly_capacity_hours),
    },
    {
      description: 'Remaining capacity based on your active assigned work.',
      title: 'Availability',
      value: formatDashboardPercent(dashboard.workSummary.availability_percentage),
    },
  ]

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-border-subtle bg-surface-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Employee workspace
            </p>
            <h1 className="text-3xl font-bold tracking-normal text-ink-900">Dashboard</h1>
            <p className="max-w-3xl text-sm leading-6 text-ink-600">
              Review what is assigned, what needs attention, how much capacity you have left, and
              the progress you have logged so far.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {dashboardQuery.isRefreshing ? (
              <span className="text-sm text-ink-500">Refreshing dashboard...</span>
            ) : null}
            <Button
              onClick={() => {
                void dashboardQuery.refetch()
              }}
              variant="secondary"
            >
              Refresh dashboard
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <SummaryCard
            description={card.description}
            key={card.title}
            title={card.title}
            value={card.value}
          />
        ))}
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <SectionCard title="Work summary">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <ProgressMeter
                  label="Current workload"
                  tone="bg-primary-600"
                  value={dashboard.workSummary.workload_percentage}
                />
                <ProgressMeter
                  label="Current availability"
                  tone="bg-success-fg"
                  value={dashboard.workSummary.availability_percentage}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                    Workload
                  </p>
                  <p
                    className={[
                      'mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                      getWorkloadTone(dashboard.workSummary.workload_percentage),
                    ].join(' ')}
                  >
                    {formatDashboardPercent(dashboard.workSummary.workload_percentage)}
                  </p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                    Availability
                  </p>
                  <p
                    className={[
                      'mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                      getAvailabilityTone(dashboard.workSummary.availability_percentage),
                    ].join(' ')}
                  >
                    {formatDashboardPercent(dashboard.workSummary.availability_percentage)}
                  </p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                    Weekly capacity
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink-900">
                    {formatDashboardHours(dashboard.workSummary.weekly_capacity_hours)}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Current assignments">
            {dashboard.currentAssignments.length === 0 ? (
              <EmptyState
                description="Assignments will appear here once work has been assigned to you."
                title="No active assignments"
              />
            ) : (
              <div className="grid gap-4">
                {dashboard.currentAssignments.map((assignment) => (
                  <AssignmentCard assignment={assignment} key={assignment.task_id} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Recent progress">
            {dashboard.recentProgress.length === 0 ? (
              <EmptyState
                description="Your recent progress updates will appear here after you submit them from the Tasks workspace."
                title="No progress updates yet"
              />
            ) : (
              <div className="space-y-3">
                {dashboard.recentProgress.map((progress) => (
                  <article
                    className="rounded-lg border border-border-subtle bg-surface-card-alt p-4"
                    key={progress.progress_id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900">{progress.task_title}</p>
                          {progress.status ? (
                            <TaskStatusBadge kind="status" value={progress.status} />
                          ) : null}
                        </div>
                        <p className="text-sm text-ink-600">{progress.project_title}</p>
                      </div>
                      <p className="text-sm font-semibold text-ink-900">
                        {formatDashboardPercent(progress.progress_percentage)}
                      </p>
                    </div>

                    <p className="mt-3 text-xs text-ink-500">
                      Logged {formatDashboardDate(progress.created_at)}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-ink-700">
                      {progress.notes?.trim() || 'No progress notes were included with this update.'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Profile summary">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-ink-900">
                    {dashboard.profile.full_name}
                  </h3>
                  <p className="text-sm text-ink-600">
                    {formatEmploymentType(dashboard.profile.employment_type)} -{' '}
                    {formatDashboardScore(dashboard.profile.performance_score)}
                  </p>
                </div>
                <Link
                  className="text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
                  to="/profile"
                >
                  Open profile
                </Link>
              </div>

              <p className="text-sm leading-6 text-ink-700">
                {dashboard.profile.bio?.trim() || 'No bio has been added to your profile yet.'}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-success-fg/25 bg-success-bg/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-success-text">
                    Approved skills
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dashboard.profile.approved_skills.length === 0 ? (
                      <p className="text-sm text-ink-600">No approved skills yet.</p>
                    ) : (
                      dashboard.profile.approved_skills.map((skill) => (
                        <span
                          className="inline-flex rounded-full border border-success-fg/25 bg-surface-card px-3 py-1 text-xs font-semibold text-success-text"
                          key={skill}
                        >
                          {skill}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-warning-fg/25 bg-warning-bg/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-warning-text">
                    Pending skills
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dashboard.profile.pending_skills.length === 0 ? (
                      <p className="text-sm text-ink-600">No pending skills.</p>
                    ) : (
                      dashboard.profile.pending_skills.map((skill) => (
                        <span
                          className="inline-flex rounded-full border border-warning-fg/25 bg-surface-card px-3 py-1 text-xs font-semibold text-warning-text"
                          key={skill}
                        >
                          {skill}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Needs attention">
            <div className="space-y-6">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">Blocked tasks</h3>
                  <p className="mt-1 text-sm text-ink-600">
                    Work items that cannot move forward until a blocker is resolved.
                  </p>
                </div>
                <CompactTaskList
                  emptyDescription="No blocked tasks need your attention right now."
                  emptyTitle="No blocked tasks"
                  items={dashboard.attention.blocked_tasks}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">Unstarted assigned tasks</h3>
                  <p className="mt-1 text-sm text-ink-600">
                    Assigned tasks that are still waiting for their first active update.
                  </p>
                </div>
                <CompactTaskList
                  emptyDescription="No unstarted assigned tasks are waiting on you."
                  emptyTitle="No unstarted tasks"
                  items={dashboard.attention.unstarted_assigned_tasks}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">
                    Tasks requiring a progress update
                  </h3>
                  <p className="mt-1 text-sm text-ink-600">
                    Progress reminders follow the current backend update rule so you can quickly see
                    where a fresh status update is needed.
                  </p>
                </div>
                <CompactTaskList
                  emptyDescription="All active tasks have a recent progress update."
                  emptyTitle="No progress reminders"
                  items={dashboard.attention.tasks_requiring_progress_update}
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import { MetricCard } from '../../../components/ui/MetricCard'
import { ProjectStatusBadge } from '../../projects/components/ProjectStatusBadge'
import { formatProjectDate } from '../../projects/utils/projectPresentation'
import {
  getTaskStatusTone,
  taskPriorityLabels,
  taskStatusLabels,
} from '../../tasks/utils/taskPresentation'
import { useSupervisorDashboard } from '../hooks/useSupervisorDashboard'
import {
  formatDashboardDate,
  formatDashboardPercent,
  formatDashboardScore,
  formatEmploymentType,
  formatRecommendationRunLabel,
  formatTopCandidateLabel,
  getAvailabilityTone,
  getWorkloadTone,
} from '../utils/dashboardPresentation'
import { SupervisorDashboardSkeleton } from './SupervisorDashboardSkeleton'

const WorkloadDistributionChart = lazy(async () => {
  const module = await import('./WorkloadDistributionChart')
  return { default: module.WorkloadDistributionChart }
})

function SectionCard({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-card p-5">
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function MiniMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink-900">{value}</p>
    </div>
  )
}

function StatusBar({
  count,
  label,
  toneClassName,
  total,
}: {
  count: number
  label: string
  toneClassName: string
  total: number
}) {
  const width = total === 0 ? 0 : Math.max(4, Math.round((count / total) * 100))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink-800">{label}</span>
        <span className="text-ink-600">{count}</span>
      </div>
      <div className="h-2.5 rounded-full bg-surface-canvas-alt">
        <div
          aria-hidden="true"
          className={['h-2.5 rounded-full', toneClassName].join(' ')}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function ProgressBar({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink-800">{label}</span>
        <span className="text-ink-600">{formatDashboardPercent(value)}</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        className="h-3 rounded-full bg-surface-canvas-alt"
        role="progressbar"
      >
        <div
          aria-hidden="true"
          className="h-3 rounded-full bg-primary-600"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

interface SupervisorDashboardModuleProps {
  organizationId: string | null
  organizationName: string
}

export function SupervisorDashboardModule({ organizationId, organizationName }: SupervisorDashboardModuleProps) {
  const dashboardQuery = useSupervisorDashboard(organizationId)

  if (dashboardQuery.isLoading) {
    return <SupervisorDashboardSkeleton />
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <ErrorState
        error={dashboardQuery.error}
        onRetry={() => {
          void dashboardQuery.refetch()
        }}
        title="Unable to load the supervisor dashboard"
      />
    )
  }

  const dashboard = dashboardQuery.data

  const summaryCards = [
    {
      description: 'Projects currently tracked in the workspace.',
      title: 'Total projects',
      value: String(dashboard.projects.total_projects),
    },
    {
      description: 'Projects actively moving through delivery.',
      title: 'Active projects',
      value: String(dashboard.projects.active_projects),
    },
    {
      description: 'Projects already completed and closed.',
      title: 'Completed projects',
      value: String(dashboard.projects.completed_projects),
    },
    {
      description: 'All task records currently in the system.',
      title: 'Total tasks',
      value: String(dashboard.tasks.total_tasks),
    },
    {
      description: 'Tasks that still need an assignee.',
      title: 'Unassigned tasks',
      value: String(dashboard.tasks.unassigned_tasks),
    },
    {
      description: 'Tasks actively being worked right now.',
      title: 'In-progress tasks',
      value: String(dashboard.tasks.in_progress_tasks),
    },
    {
      description: 'Tasks blocked and needing supervisor attention.',
      title: 'Blocked tasks',
      value: String(dashboard.tasks.blocked_tasks),
    },
    {
      description: 'Tasks already completed.',
      title: 'Completed tasks',
      value: String(dashboard.tasks.completed_tasks),
    },
    {
      description: 'Employee profiles available for planning and assignment.',
      title: 'Total employees',
      value: String(dashboard.employees.total_employees),
    },
    {
      description: 'Employees with remaining capacity to take work.',
      title: 'Available employees',
      value: String(dashboard.employees.available_employees),
    },
    {
      description: 'Employees at or above the high-workload threshold.',
      title: 'High-workload employees',
      value: String(dashboard.employees.high_workload_employees),
    },
    {
      description: 'Projects that already have analyzed document context.',
      title: 'Projects with completed analysis',
      tone: 'ai' as const,
      value: String(dashboard.documents.projects_with_completed_analysis),
    },
    {
      description: 'Projects with saved recommendation runs ready for review.',
      title: 'Projects with recommendation runs',
      tone: 'ai' as const,
      value: String(dashboard.recommendations.projects_with_recommendation_runs),
    },
  ]

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-border-subtle bg-surface-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Organization administrator workspace
            </p>
            <h1 className="text-3xl font-bold tracking-normal text-ink-900">
              Dashboard
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-ink-600">
              {organizationName} — review delivery, workload, document analysis coverage, and AI recommendation readiness.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {dashboardQuery.isFetching ? (
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard detail={card.description} key={card.title} label={card.title} value={card.value} />
        ))}
      </section>

      <section className="rounded-lg border border-border-subtle bg-surface-card p-5">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-ink-900">Quick actions</h2>
          <p className="text-sm leading-6 text-ink-600">
            Jump directly into the current planning and assignment workflows.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              description: 'Open the Projects workspace to create and review project details.',
              href: '/projects',
              label: 'Create project',
            },
            {
              description: 'Review the project list and inspect project details.',
              href: '/projects',
              label: 'View projects',
            },
            {
              description: 'Open task management to review current work items.',
              href: '/tasks',
              label: 'View tasks',
            },
            {
              description: 'Use the existing Tasks assignment flow to manage assignees.',
              href: '/tasks',
              label: 'Manage assignments',
            },
            {
              description: 'Open Projects to upload or inspect project documents.',
              href: '/projects',
              label: 'Upload project document',
            },
            {
              description: 'Review saved AI recommendation runs and generate new ones.',
              href: '/ai-recommendations',
              label: 'Review recommendations',
              tone: 'ai',
            },
          ].map((action) => (
            <Link
              className={[
                'rounded-lg border p-4 transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300',
                action.tone === 'ai'
                  ? 'border-ai-fg/20 bg-ai-bg/40 hover:border-ai-fg/40'
                  : 'border-border-subtle bg-surface-card-alt hover:border-primary-300',
              ].join(' ')}
              key={action.label}
              to={action.href}
            >
              <p
                className={[
                  'text-sm font-semibold',
                  action.tone === 'ai' ? 'text-ai-text' : 'text-ink-900',
                ].join(' ')}
              >
                {action.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <SectionCard title="Project progress">
            {dashboard.projectProgress.length === 0 ? (
              <EmptyState
                description="Project progress will appear here after projects and tasks are created."
                title="No project progress yet"
              />
            ) : (
              <div className="grid gap-4">
                {dashboard.projectProgress.map((project) => (
                  <article
                    className="rounded-lg border border-border-subtle bg-surface-card-alt p-4"
                    key={project.project_id}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ink-900">{project.title}</h3>
                          <ProjectStatusBadge kind="status" value={project.status} />
                          <ProjectStatusBadge kind="priority" value={project.priority} />
                        </div>
                        <p className="text-sm text-ink-600">
                          {project.completed_task_count} of {project.total_task_count} tasks
                          completed
                        </p>
                      </div>

                      <Link
                        className="text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
                        to="/projects"
                      >
                        View project details
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <ProgressBar
                        label={`${project.title} completion progress`}
                        value={project.progress_percentage}
                      />
                      <p className="text-sm text-ink-500">
                        Updated {formatProjectDate(project.updated_at)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Employee workload">
            {dashboard.employees.top_workloads.length === 0 ? (
              <EmptyState
                description="Employee capacity and workload records will appear here once employee profiles exist."
                title="No employee workload records"
              />
            ) : (
              <div className="grid gap-4">
                {dashboard.employees.top_workloads.map((employee) => (
                  <article
                    className="rounded-lg border border-border-subtle bg-surface-card-alt p-4"
                    key={employee.id}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-ink-900">
                          {employee.full_name}
                        </h3>
                        <p className="mt-1 text-sm text-ink-600">
                          {formatEmploymentType(employee.employment_type)} ·{' '}
                          {employee.weekly_capacity_hours} hrs weekly capacity
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={[
                            'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                            getWorkloadTone(employee.workload_percentage),
                          ].join(' ')}
                        >
                          {formatDashboardPercent(employee.workload_percentage)} workload
                        </span>
                        <span
                          className={[
                            'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                            getAvailabilityTone(employee.availability_percentage),
                          ].join(' ')}
                        >
                          {formatDashboardPercent(employee.availability_percentage)} available
                        </span>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MiniMetric
                        label="Workload"
                        value={formatDashboardPercent(employee.workload_percentage)}
                      />
                      <MiniMetric
                        label="Availability"
                        value={formatDashboardPercent(employee.availability_percentage)}
                      />
                      <MiniMetric
                        label="Performance"
                        value={formatDashboardScore(employee.performance_score)}
                      />
                      <MiniMetric
                        label="Weekly capacity"
                        value={`${employee.weekly_capacity_hours} hrs`}
                      />
                    </dl>
                  </article>
                ))}
              </div>
            )}
            <div className="mt-5"><Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-surface-muted" role="status">Loading workload chart…</div>}><WorkloadDistributionChart employees={dashboard.employees.top_workloads} /></Suspense></div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Task status overview">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniMetric
                  label="Assigned tasks"
                  value={String(dashboard.tasks.assigned_tasks)}
                />
                <MiniMetric
                  label="Unassigned tasks"
                  value={String(dashboard.tasks.unassigned_tasks)}
                />
              </div>

              <div className="space-y-4">
                <StatusBar
                  count={dashboard.tasks.by_status.todo}
                  label="To do"
                  toneClassName="bg-surface-muted"
                  total={dashboard.tasks.total_tasks}
                />
                <StatusBar
                  count={dashboard.tasks.by_status.in_progress}
                  label="In progress"
                  toneClassName="bg-info-fg"
                  total={dashboard.tasks.total_tasks}
                />
                <StatusBar
                  count={dashboard.tasks.by_status.blocked}
                  label="Blocked"
                  toneClassName="bg-danger-500"
                  total={dashboard.tasks.total_tasks}
                />
                <StatusBar
                  count={dashboard.tasks.by_status.review}
                  label="In review"
                  toneClassName="bg-warning-fg"
                  total={dashboard.tasks.total_tasks}
                />
                <StatusBar
                  count={dashboard.tasks.by_status.completed}
                  label="Completed"
                  toneClassName="bg-success-fg"
                  total={dashboard.tasks.total_tasks}
                />
              </div>

              {dashboard.tasks.recent_tasks.length > 0 ? (
                <div className="border-t border-border-subtle pt-4">
                  <p className="text-sm font-semibold text-ink-900">Recent tasks</p>
                  <div className="mt-3 grid gap-3">
                    {dashboard.tasks.recent_tasks.map((task) => (
                      <div
                        className="rounded-lg border border-border-subtle bg-surface-card-alt p-3"
                        key={task.id}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-ink-900">{task.title}</p>
                            <span
                              className={[
                                'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                                getTaskStatusTone(task.status),
                              ].join(' ')}
                            >
                              {taskStatusLabels[task.status]}
                            </span>
                          </div>
                          <p className="text-sm text-ink-600">
                            {task.project_title} · {taskPriorityLabels[task.priority]}
                          </p>
                          <p className="text-xs text-ink-500">
                            Updated {formatDashboardDate(task.updated_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Document analysis">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniMetric
                  label="Uploaded documents"
                  value={String(dashboard.documents.total_uploaded_documents)}
                />
                <MiniMetric
                  label="Completed analysis"
                  value={String(dashboard.documents.projects_with_completed_analysis)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric
                  label="Pending extraction"
                  value={String(dashboard.documents.by_extraction_status.pending)}
                />
                <MiniMetric
                  label="Extracted"
                  value={String(dashboard.documents.by_extraction_status.extracted)}
                />
                <MiniMetric
                  label="Failed extraction"
                  value={String(dashboard.documents.by_extraction_status.failed)}
                />
              </div>

              {dashboard.documents.recent_analyzed_projects.length === 0 ? (
                <EmptyState
                  description="Analyzed projects will appear here after document uploads are processed."
                  title="No analyzed projects yet"
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-ink-900">Recent analyzed projects</p>
                  {dashboard.documents.recent_analyzed_projects.map((project) => (
                    <div
                      className="rounded-lg border border-border-subtle bg-surface-card-alt p-4"
                      key={project.analysis_id}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-ink-900">{project.title}</p>
                            <ProjectStatusBadge kind="status" value={project.status} />
                            <ProjectStatusBadge kind="priority" value={project.priority} />
                          </div>
                          <p className="text-xs text-ink-500">
                            Analyzed {formatDashboardDate(project.analyzed_at)}
                          </p>
                        </div>
                        <Link
                          className="text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
                          to="/projects"
                        >
                          Open projects
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="AI recommendations">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-ai-fg/20 bg-ai-bg/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-ai-text">
                    Latest run
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">
                    {formatRecommendationRunLabel(
                      dashboard.recommendations.latest_recommendation_run,
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-ai-fg/20 bg-ai-bg/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-ai-text">
                    Top candidate
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">
                    {formatTopCandidateLabel(
                      dashboard.recommendations.latest_top_ranked_candidate,
                    )}
                  </p>
                </div>
              </div>

              {dashboard.recommendations.recent_recommendation_runs.length === 0 ? (
                <EmptyState
                  description="Recommendation runs will appear here after project analysis is ready and the first run is generated."
                  title="No recommendation runs yet"
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-ink-900">Recent recommendation runs</p>
                  {dashboard.recommendations.recent_recommendation_runs.map((run) => (
                    <div
                      className="rounded-lg border border-ai-fg/20 bg-ai-bg/30 p-4"
                      key={run.recommendation_run_id}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900">{run.project_title}</p>
                          <span className="inline-flex rounded-full border border-ai-fg/30 bg-ai-bg px-2.5 py-1 text-xs font-semibold text-ai-text">
                            AI run
                          </span>
                        </div>
                        <p className="text-sm text-ink-600">
                          {run.top_candidate
                            ? `${run.top_candidate.employee_name} ranked #${run.top_candidate.rank} at ${formatDashboardScore(run.top_candidate.match_score)}`
                            : 'No top candidate recorded for this run.'}
                        </p>
                        <p className="text-xs text-ink-500">
                          Generated {formatDashboardDate(run.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border-subtle pt-4">
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-ai-fg px-4 py-2 text-sm font-semibold text-white transition hover:bg-ai-text focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
                  to="/ai-recommendations"
                >
                  Review recommendations
                </Link>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

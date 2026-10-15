import { Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarList } from '../../../components/charts/BarList'
import { ChartCard } from '../../../components/charts/ChartCard'
import { DonutChart } from '../../../components/charts/DonutChart'
import { AiNote } from '../../../components/ui/AiNote'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { PageHeader } from '../../../components/ui/PageHeader'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatTile } from '../../../components/ui/StatTile'
import { boardStatuses, statusColorTokens } from '../../tasks/utils/taskBoard'
import { taskStatusLabels } from '../../tasks/utils/taskPresentation'
import { useSupervisorDashboard } from '../hooks/useSupervisorDashboard'
import { SupervisorDashboardSkeleton } from './SupervisorDashboardSkeleton'

const HIGH_WORKLOAD_THRESHOLD = 80

function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

interface SupervisorDashboardModuleProps {
  organizationId: string | null
  organizationName: string
  teamHref: string
}

export function SupervisorDashboardModule({ organizationId, organizationName, teamHref }: SupervisorDashboardModuleProps) {
  const dashboardQuery = useSupervisorDashboard(organizationId)

  if (dashboardQuery.isLoading) {
    return <SupervisorDashboardSkeleton />
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <Card>
          <StateBlock action={<Button onClick={() => { void dashboardQuery.refetch() }} variant="secondary">Retry</Button>} kind="error" title="The dashboard could not be loaded">
            Check your connection, then try again.
          </StateBlock>
        </Card>
      </div>
    )
  }

  const { employees, projectProgress, projects, recommendations, tasks } = dashboardQuery.data
  const openStatuses = ['todo', 'in_progress', 'review', 'blocked'] as const
  const openTasks = openStatuses.reduce((sum, status) => sum + tasks.by_status[status], 0)
  const statusData = boardStatuses.map((status) => ({
    color: statusColorTokens[status],
    name: taskStatusLabels[status],
    value: tasks.by_status[status],
  }))
  const workloadData = employees.top_workloads.map((employee) => ({ name: employee.full_name, value: employee.workload_percentage }))
  const suggestedRuns = recommendations.recent_recommendation_runs.filter((run) => run.top_candidate).slice(0, 4)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <>
            {dashboardQuery.isFetching ? <span className="helper text-text-tertiary">Refreshing…</span> : null}
            <Button onClick={() => { void dashboardQuery.refetch() }} variant="secondary">Refresh</Button>
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary-600 px-4 text-sm font-semibold text-text-on-primary no-underline hover:bg-primary-700" to="/tasks">
              <Plus aria-hidden="true" size={16} />
              New task
            </Link>
          </>
        }
        subtitle={
          tasks.unassigned_tasks === 0
            ? `Every task in ${organizationName} has an owner.`
            : `${tasks.unassigned_tasks} task${tasks.unassigned_tasks === 1 ? ' is' : 's are'} waiting for an owner.`
        }
        title={getGreeting()}
      />

      <section aria-label="Headline numbers" className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <StatTile
          context={`${projects.completed_projects} completed · ${projects.total_projects} in total`}
          href={{ label: 'View', to: '/projects' }}
          label="Active projects"
          value={projects.active_projects}
        />
        <StatTile
          href={{ label: 'View', to: '/tasks' }}
          label="Open tasks"
          meter={{
            label: 'Open tasks by status',
            segments: openStatuses.map((status) => ({
              color: statusColorTokens[status],
              label: taskStatusLabels[status],
              value: tasks.by_status[status],
            })),
          }}
          value={openTasks}
        />
        <StatTile
          context={`${employees.high_workload_employees} over ${HIGH_WORKLOAD_THRESHOLD}% · ${employees.available_employees} available`}
          label="Team utilization"
          progress={{ label: 'Average team workload', value: employees.average_workload }}
          value={`${Math.round(employees.average_workload)}%`}
        />
      </section>

      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
        <ChartCard
          helper="All projects"
          state={tasks.total_tasks === 0 ? 'empty' : 'ready'}
          emptyText="Task status appears once tasks are created."
          table={{
            columns: [{ key: 'status', label: 'Status' }, { key: 'count', label: 'Tasks' }],
            rows: statusData.map((item) => ({ count: item.value, status: item.name })),
          }}
          title="Task status"
        >
          <DonutChart centerLabel="tasks" data={statusData} />
        </ChartCard>

        <ChartCard
          action={<Link className="label text-text-link no-underline hover:text-primary-700" to={teamHref}>View team</Link>}
          emptyText="Workload appears once employees join and take on tasks."
          helper={`Dashed line marks the ${HIGH_WORKLOAD_THRESHOLD}% limit`}
          state={workloadData.length === 0 ? 'empty' : 'ready'}
          table={{
            columns: [{ key: 'name', label: 'Employee' }, { key: 'value', label: 'Workload', unit: '%' }],
            rows: workloadData.map((item) => ({ name: item.name, value: Math.round(item.value) })),
          }}
          title="Team workload"
        >
          <BarList data={workloadData} threshold={HIGH_WORKLOAD_THRESHOLD} />
        </ChartCard>
      </div>

      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
        <Card aria-labelledby="dashboard-suggested-title" className="flex flex-col gap-4" variant="ai">
          <CardHeader
            icon={
              <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-pill bg-ai-bg text-ai-fg">
                <Sparkles size={16} />
              </span>
            }
            id="dashboard-suggested-title"
            title="Suggested owners"
          />
          {suggestedRuns.length === 0 ? (
            <StateBlock action={<Link className="label text-text-link" to="/ai-recommendations">Open AI recommendations</Link>} compact>
              Suggestions appear after a project's requirements are analyzed.
            </StateBlock>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {suggestedRuns.map((run, index) => (
                <li
                  className={['flex items-center gap-3 py-3', index < suggestedRuns.length - 1 ? 'border-b border-chart-grid' : ''].join(' ')}
                  key={run.recommendation_run_id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="body-strong m-0 truncate text-text-primary">{run.project_title}</p>
                    <p className="helper m-0 text-text-tertiary">Suggested: {run.top_candidate?.employee_name}</p>
                  </div>
                  <span className="num-sm rounded-sm bg-ai-bg px-2 py-0.5 text-ai-fg">{Math.round(run.top_candidate?.match_score ?? 0)}%</span>
                  <Link
                    className="label inline-flex min-h-9 items-center rounded-control border border-border-strong px-3 text-text-primary no-underline hover:bg-surface-muted"
                    to={`/projects/${run.project_id}?tab=recommendations`}
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <AiNote />
        </Card>

        <Card aria-labelledby="dashboard-progress-title" className="flex flex-col gap-4">
          <CardHeader helper="Completed tasks out of total" id="dashboard-progress-title" title="Project progress" />
          {projectProgress.length === 0 ? (
            <StateBlock compact>Progress appears once projects have tasks.</StateBlock>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {projectProgress.slice(0, 6).map((project) => (
                <li className="flex flex-col gap-1.5" key={project.project_id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <Link className="body-strong truncate text-text-primary no-underline hover:text-text-link" to={`/projects/${project.project_id}`}>
                      {project.title}
                    </Link>
                    <span className="num-sm shrink-0 text-text-primary">
                      {project.completed_task_count}/{project.total_task_count} tasks
                    </span>
                  </div>
                  <ProgressBar label={`${project.title} progress`} showValue={false} value={project.progress_percentage} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

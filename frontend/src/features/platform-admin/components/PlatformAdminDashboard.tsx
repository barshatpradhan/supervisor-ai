import { UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatTile } from '../../../components/ui/StatTile'
import { useApiResource } from '../../../hooks/useApiResource'
import { getDashboardMetrics } from '../services/adminDashboardService'
import { listEmployeeUsers } from '../../../services/employees/employeeService'
import { PendingSkillsQueue } from './PendingSkillsQueue'
import { UserDirectory } from './UserDirectory'

export function PlatformAdminDashboard() {
  const usersQuery = useApiResource(listEmployeeUsers)
  const metricsQuery = useApiResource(getDashboardMetrics)

  const users = usersQuery.data ?? []
  const employees = users.filter((user) => user.role === 'employee').length
  const supervisors = users.filter((user) => user.role === 'supervisor').length
  const administrators = users.filter((user) => user.role === 'admin').length
  const metrics = metricsQuery.data
  const totalsFailed = Boolean(metricsQuery.error || usersQuery.error)

  function refreshTotals() {
    void metricsQuery.refetch()
    void usersQuery.refetch()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary-600 px-4 text-sm font-semibold text-text-on-primary no-underline hover:bg-primary-700"
            to="/admin/users/new"
          >
            <UserPlus aria-hidden="true" size={16} />
            Create user
          </Link>
        }
        subtitle="Every organization and account on the platform, and the skills waiting for review."
        title="Platform"
      />

      {totalsFailed ? (
        <StateBlock action={<Button onClick={refreshTotals} variant="secondary">Retry</Button>} kind="error" title="Platform totals could not be loaded">
          The user list below may still work.
        </StateBlock>
      ) : metricsQuery.isLoading || usersQuery.isLoading || !metrics ? (
        <StateBlock kind="loading" title="Loading platform totals" />
      ) : (
        <section aria-label="Platform totals" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
          <StatTile context="On the platform" label="Organizations" value={metrics.organizationCount} />
          <StatTile
            context={`${employees} employees · ${supervisors} supervisors · ${administrators} admins`}
            label="Users"
            meter={{
              label: 'Users by account role',
              segments: [
                { color: 'chart-1', label: 'Employees', value: employees },
                { color: 'chart-2', label: 'Supervisors', value: supervisors },
                { color: 'chart-3', label: 'Admins', value: administrators },
              ],
            }}
            value={metrics.userCount}
          />
          <StatTile
            context={metrics.pendingSkillsCount === 0 ? 'Nothing to review' : 'Waiting for review below'}
            label="Pending skills"
            value={metrics.pendingSkillsCount}
          />
        </section>
      )}

      <PendingSkillsQueue onChange={() => { void metricsQuery.refetch() }} />

      <UserDirectory />
    </div>
  )
}

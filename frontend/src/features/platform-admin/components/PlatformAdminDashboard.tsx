import { Link } from 'react-router-dom'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useApiResource } from '../../../hooks/useApiResource'
import { listEmployeeUsers } from '../../../services/employees/employeeService'

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-ink-700">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-ink-900">{value}</p>
    </Card>
  )
}

export function PlatformAdminDashboard() {
  const usersQuery = useApiResource(listEmployeeUsers)

  if (usersQuery.isLoading) {
    return <LoadingState label="Loading platform administration..." />
  }

  if (usersQuery.error || !usersQuery.data) {
    return (
      <ErrorState
        error={usersQuery.error}
        onRetry={() => void usersQuery.refetch()}
        title="Unable to load platform administration"
      />
    )
  }

  const users = usersQuery.data
  const employees = users.filter((user) => user.role === 'employee').length
  const supervisors = users.filter((user) => user.role === 'supervisor').length
  const administrators = users.filter((user) => user.role === 'admin').length

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-border-subtle bg-surface-card p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
          Platform administration
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-ink-900">Platform dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
              Review managed account totals and provision employee or supervisor accounts.
            </p>
          </div>
          <Link to="/admin/users/new">
            <Button>Create user</Button>
          </Link>
        </div>
      </section>

      <section aria-label="Managed account totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Managed users" value={users.length} />
        <Metric label="Employees" value={employees} />
        <Metric label="Supervisors" value={supervisors} />
        <Metric label="Administrators" value={administrators} />
      </section>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Managed accounts</h2>
            <p className="mt-1 text-sm text-ink-600">
              Accounts returned by the platform administration service.
            </p>
          </div>
          <Button onClick={() => void usersQuery.refetch()} variant="secondary">
            {usersQuery.isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {users.length === 0 ? (
          <p className="mt-5 text-sm text-ink-600">No managed accounts have been created yet.</p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {users.map((user) => (
              <li className="rounded-lg border border-border-subtle bg-surface-card-alt p-4" key={user.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-ink-900">{user.email ?? 'Email unavailable'}</p>
                  <span className="text-sm capitalize text-ink-600">{user.role}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

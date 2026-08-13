import { useMemo, useState } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useOrganizationTeam } from '../hooks/useOrganizationTeam'

type TeamRoleFilter = 'all' | 'employee' | 'supervisor'

const filters: { label: string; value: TeamRoleFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Employees', value: 'employee' },
  { label: 'Supervisors', value: 'supervisor' },
]

function profileName(member: {
  employee_full_name: string | null
  supervisor_full_name: string | null
}) {
  return member.employee_full_name ?? member.supervisor_full_name ?? 'Profile pending'
}

export function OrganizationTeamDirectory() {
  const { activeOrganization } = useOrganization()
  const teamQuery = useOrganizationTeam(activeOrganization?.id ?? null)
  const [filter, setFilter] = useState<TeamRoleFilter>('all')
  const [search, setSearch] = useState('')

  const members = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return (teamQuery.data ?? []).filter((member) => {
      if (member.status !== 'active' || (member.role !== 'employee' && member.role !== 'supervisor')) {
        return false
      }

      if (filter !== 'all' && member.role !== filter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [profileName(member), member.email ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      )
    })
  }, [filter, search, teamQuery.data])

  if (teamQuery.isLoading) {
    return <LoadingState label="Loading organization team..." />
  }

  if (teamQuery.error || !teamQuery.data) {
    return (
      <ErrorState
        error={teamQuery.error}
        onRetry={() => void teamQuery.refetch()}
        title="Unable to load organization team"
      />
    )
  }

  const hasActiveTeamMembers = teamQuery.data.some(
    (member) =>
      member.status === 'active' && (member.role === 'employee' || member.role === 'supervisor'),
  )
  const emptyTitle = filter === 'all' ? 'No team members yet' : `No ${filter}s found`
  const emptyDescription = hasActiveTeamMembers
    ? 'Try a different role filter or search term.'
    : 'Invite supervisors and employees to start building your organization.'

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            Organization directory
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink-900">Team</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            Review the active employees and supervisors in {activeOrganization?.name ?? 'this organization'}.
          </p>
        </div>
        <Button disabled={teamQuery.isFetching} onClick={() => void teamQuery.refetch()} variant="secondary">
          {teamQuery.isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </section>

      <Card className="grid gap-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Team role filter">
          {filters.map((item) => (
            <Button
              aria-selected={filter === item.value}
              key={item.value}
              onClick={() => setFilter(item.value)}
              role="tab"
              variant={filter === item.value ? 'primary' : 'secondary'}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <label className="grid max-w-md gap-1 text-sm font-semibold text-ink-800">
          Search team
          <input
            className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition focus:border-primary-600 focus:ring-3 focus:ring-primary-200"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
            type="search"
            value={search}
          />
        </label>
      </Card>

      {members.length === 0 ? (
        <Card className="text-center">
          <h2 className="text-lg font-bold text-ink-900">{emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-600">{emptyDescription}</p>
        </Card>
      ) : (
        <section aria-label="Active organization team" className="grid gap-4 lg:grid-cols-2">
          {members.map((member) => (
            <Card className="grid gap-4" key={member.membership_id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">{profileName(member)}</h2>
                  {member.email ? <p className="mt-1 text-sm text-ink-600">{member.email}</p> : null}
                </div>
                <span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold capitalize text-primary-700">
                  {member.role}
                </span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-3">
                  <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Profile</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink-900">
                    {member.role === 'employee' ? 'Employee profile' : 'Supervisor profile'}
                  </dd>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-3">
                  <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">Status</dt>
                  <dd className="mt-1 text-sm font-semibold capitalize text-ink-900">{member.status}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </section>
      )}
    </div>
  )
}

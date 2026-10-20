import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Chip } from '../../../components/ui/Chip'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { fieldInputClass, fieldLabelClass } from '../../../components/ui/fieldStyles'
import { useApiResource } from '../../../hooks/useApiResource'
import { listUserDirectory, type UserDirectoryFilters } from '../../../services/admin/adminUserDirectoryService'
import type { BackendUserDirectoryEntry, BackendUserDirectoryRoleFilter } from '../../../types/backend'

const EMPTY_FILTERS: UserDirectoryFilters = { organizationId: '', page: 1, role: '', search: '', teamId: '' }
const SEARCH_DEBOUNCE_MS = 250

const ROLE_OPTIONS: { id: BackendUserDirectoryRoleFilter | ''; label: string }[] = [
  { id: '', label: 'All roles' },
  { id: 'organization_admin', label: 'Organization admin' },
  { id: 'supervisor', label: 'Supervisor' },
  { id: 'employee', label: 'Employee' },
  { id: 'platform_admin', label: 'Platform admin' },
  { id: 'unassigned', label: 'No organization role' },
]

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee',
  organization_admin: 'Org admin',
  supervisor: 'Supervisor',
}

const selectClass = `${fieldInputClass} min-w-0`

function groupLabel(entry: BackendUserDirectoryEntry) {
  return {
    organization: entry.organization?.name ?? 'No organization',
    team: entry.organization ? entry.teams[0]?.name ?? 'No team' : null,
  }
}

/**
 * Every user on the platform, grouped by organization and then team, ten at a time.
 * Filtering and paging happen on the server so the page never loads the whole list.
 */
export function UserDirectory() {
  const [filters, setFilters] = useState<UserDirectoryFilters>(EMPTY_FILTERS)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => (current.search === searchInput ? current : { ...current, page: 1, search: searchInput }))
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const fetchDirectory = useCallback(() => listUserDirectory(filters), [filters])
  const directory = useApiResource(fetchDirectory)
  const data = directory.data
  const organizations = useMemo(() => data?.filters.organizations ?? [], [data])

  // Team choices follow the organization filter; with all organizations they are grouped.
  const teamGroups = useMemo(() => {
    if (filters.organizationId === 'none') return []
    return organizations.filter(
      (organization) => organization.teams.length > 0 && (!filters.organizationId || organization.id === filters.organizationId),
    )
  }, [filters.organizationId, organizations])

  const hasFilters = Boolean(filters.organizationId || filters.teamId || filters.role || filters.search)
  const firstShown = data && data.total > 0 ? (data.page - 1) * data.page_size + 1 : 0
  const lastShown = data ? firstShown + data.items.length - Math.min(1, data.items.length) : 0

  function update(next: Partial<UserDirectoryFilters>) {
    setFilters((current) => ({ ...current, page: 1, ...next }))
  }

  function clearFilters() {
    setSearchInput('')
    setFilters(EMPTY_FILTERS)
  }

  return (
    <Card aria-labelledby="user-directory-title" className="flex flex-col" padding="flush">
      <div className="flex flex-col gap-4 px-5 pb-4 pt-5">
        <CardHeader
          action={
            <Button disabled={directory.isRefreshing} onClick={() => { void directory.refetch() }} variant="secondary">
              {directory.isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          }
          helper="Grouped by organization, then team · 10 per page"
          id="user-directory-title"
          title="Users"
        />

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
          <label className={fieldLabelClass}>
            Search
            <input
              className={fieldInputClass}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, email or title"
              type="search"
              value={searchInput}
            />
          </label>
          <label className={fieldLabelClass}>
            Organization
            <select
              className={selectClass}
              onChange={(event) => update({ organizationId: event.target.value, teamId: '' })}
              value={filters.organizationId}
            >
              <option value="">All organizations</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
              <option value="none">No organization</option>
            </select>
          </label>
          <label className={fieldLabelClass}>
            Team
            <select
              className={selectClass}
              disabled={filters.organizationId === 'none'}
              onChange={(event) => update({ teamId: event.target.value })}
              value={filters.teamId}
            >
              <option value="">All teams</option>
              {teamGroups.length === 1
                ? teamGroups[0].teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)
                : teamGroups.map((organization) => (
                    <optgroup key={organization.id} label={organization.name}>
                      {organization.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </optgroup>
                  ))}
              <option value="none">No team</option>
            </select>
          </label>
          <label className={fieldLabelClass}>
            Role
            <select
              className={selectClass}
              onChange={(event) => update({ role: event.target.value as UserDirectoryFilters['role'] })}
              value={filters.role}
            >
              {ROLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {directory.isLoading ? <div className="px-5 pb-5"><StateBlock kind="loading" title="Loading users" /></div> : null}
      {directory.error ? (
        <div className="px-5 pb-5">
          <StateBlock action={<Button onClick={() => { void directory.refetch() }} variant="secondary">Retry</Button>} kind="error" title="Users could not be loaded">
            {directory.error.message}
          </StateBlock>
        </div>
      ) : null}
      {data && data.total === 0 ? (
        <div className="px-5 pb-5">
          <StateBlock
            action={hasFilters ? <Button onClick={clearFilters} variant="secondary">Clear filters</Button> : undefined}
            title={hasFilters ? 'No users match these filters' : 'No users yet'}
          >
            {hasFilters ? 'Try a different name, organization, team or role.' : 'Users appear here once they sign up or are created.'}
          </StateBlock>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="body w-full min-w-[720px] border-collapse text-left">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="label px-5 py-2.5 text-text-secondary" scope="col">Person</th>
                  <th className="label px-3 py-2.5 text-text-secondary" scope="col">Role</th>
                  <th className="label px-3 py-2.5 text-text-secondary" scope="col">Teams</th>
                  <th className="label px-5 py-2.5 text-text-secondary" scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry, index) => {
                  const group = groupLabel(entry)
                  const previous = index > 0 ? groupLabel(data.items[index - 1]) : null
                  const newOrganization = !previous || previous.organization !== group.organization
                  const newTeam = group.team !== null && (newOrganization || previous?.team !== group.team)
                  const name = entry.full_name ?? entry.email ?? 'Unnamed user'

                  return (
                    <Fragment key={entry.key}>
                      {newOrganization ? (
                        <tr className="border-t border-border-strong bg-surface-card">
                          <th className="section-title px-5 pb-1 pt-4 text-text-primary" colSpan={4} scope="colgroup">
                            {group.organization}
                          </th>
                        </tr>
                      ) : null}
                      {newTeam ? (
                        <tr>
                          <th className="label px-5 pb-1.5 pt-2 text-text-tertiary" colSpan={4} scope="colgroup">
                            {group.team}
                          </th>
                        </tr>
                      ) : null}
                      <tr className="border-t border-chart-grid">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} size={32} />
                            <div className="min-w-0">
                              <div className="body-strong truncate text-text-primary">{name}</div>
                              <div className="helper truncate text-text-tertiary">
                                {[entry.full_name ? entry.email : null, entry.job_title].filter(Boolean).join(' · ') || ' '}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {entry.organization_role ? <Chip>{ROLE_LABELS[entry.organization_role] ?? entry.organization_role}</Chip> : null}
                            {entry.platform_role === 'platform_admin' ? <Chip tone="ai">Platform admin</Chip> : null}
                            {!entry.organization_role && entry.platform_role !== 'platform_admin' ? (
                              <span className="helper text-text-tertiary">–</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-text-secondary">
                          {entry.teams.length > 0 ? entry.teams.map((team) => team.name).join(', ') : '–'}
                        </td>
                        <td className="px-5 py-3">
                          {entry.membership_status ? (
                            <StatusBadge
                              label={entry.membership_status === 'active' ? 'Active' : entry.membership_status === 'invited' ? 'Invited' : 'Suspended'}
                              status={entry.membership_status === 'active' ? 'available' : entry.membership_status === 'invited' ? 'pending' : 'blocked'}
                            />
                          ) : (
                            <span className="helper text-text-tertiary">No membership</span>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-chart-grid px-5 py-3">
            <p className="helper m-0 text-text-secondary" aria-live="polite">
              Showing {firstShown}–{lastShown} of {data.total} {data.total === 1 ? 'user' : 'users'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                aria-label="Previous page"
                disabled={data.page <= 1 || directory.isRefreshing}
                onClick={() => setFilters((current) => ({ ...current, page: data.page - 1 }))}
                variant="secondary"
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </Button>
              <span className="num-sm text-text-secondary">Page {data.page} of {data.total_pages}</span>
              <Button
                aria-label="Next page"
                disabled={data.page >= data.total_pages || directory.isRefreshing}
                onClick={() => setFilters((current) => ({ ...current, page: data.page + 1 }))}
                variant="secondary"
              >
                <ChevronRight aria-hidden="true" size={16} />
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  )
}

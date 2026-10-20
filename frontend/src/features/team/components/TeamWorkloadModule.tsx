import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartCard } from '../../../components/charts/ChartCard'
import { ColumnChart } from '../../../components/charts/ColumnChart'
import { RadialScore } from '../../../components/charts/RadialScore'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { PageHeader } from '../../../components/ui/PageHeader'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useAssignableEmployees } from '../../tasks/hooks/useAssignableEmployees'
import { useTasks } from '../../tasks/hooks/useTasks'
import { useOrganizationTeam } from '../hooks/useOrganizationTeam'
import { useOrganizationTeams } from '../hooks/useOrganizationTeams'

const ALL_TEAMS = 'all'
const HIGH_WORKLOAD_THRESHOLD = 80
const NEAR_CAPACITY_THRESHOLD = 70

function getCapacityStatus(workload: number) {
  if (workload > HIGH_WORKLOAD_THRESHOLD) return 'over'
  if (workload >= NEAR_CAPACITY_THRESHOLD) return 'near'
  return 'available'
}

function formatHours(value: number) {
  return `${Number(value.toFixed(1))}h`
}

/** Supervisors from the membership list. Only organization admins can read it. */
function SupervisorList({ organizationId }: { organizationId: string }) {
  const teamQuery = useOrganizationTeam(organizationId)
  const supervisors = (teamQuery.data ?? []).filter((member) => member.status === 'active' && member.role === 'supervisor')

  return (
    <Card aria-labelledby="team-supervisors-title" className="flex flex-col gap-4">
      <CardHeader helper="Active supervisor memberships" id="team-supervisors-title" title="Supervisors" />
      {teamQuery.isLoading ? <StateBlock compact kind="loading" title="Loading supervisors" /> : null}
      {teamQuery.error ? (
        <StateBlock action={<Button onClick={() => { void teamQuery.refetch() }} variant="secondary">Retry</Button>} compact kind="error">
          Supervisors could not be loaded.
        </StateBlock>
      ) : null}
      {!teamQuery.isLoading && !teamQuery.error && supervisors.length === 0 ? (
        <StateBlock compact>No supervisors yet. Invite one from Invitations.</StateBlock>
      ) : null}
      {supervisors.length > 0 ? (
        <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {supervisors.map((member) => {
            const name = member.supervisor_full_name ?? member.email ?? 'Profile pending'
            return (
              <li className="flex items-center gap-3 rounded-control border border-chart-grid p-3" key={member.membership_id}>
                <Avatar name={name} size={32} />
                <div className="min-w-0">
                  <p className="body-strong m-0 truncate text-text-primary">{name}</p>
                  {member.email ? <p className="helper m-0 truncate text-text-tertiary">{member.email}</p> : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </Card>
  )
}

export function TeamWorkloadModule() {
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const isAdmin = activeMembershipRole === 'organization_admin'
  const directory = useAssignableEmployees(true)
  const tasksQuery = useTasks()
  const teamsQuery = useOrganizationTeams(activeOrganization?.id ?? null)
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data])
  const [selectedTeamId, setSelectedTeamId] = useState(ALL_TEAMS)
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null

  // Team names per employee; an employee can be on more than one team.
  const teamNamesByEmployee = useMemo(() => {
    const names = new Map<string, string[]>()
    for (const team of teams) {
      for (const member of team.members) names.set(member.employee_id, [...(names.get(member.employee_id) ?? []), team.name])
    }
    return names
  }, [teams])

  // Charts and the table follow the team filter.
  const employees = useMemo(() => {
    const all = directory.data ?? []
    if (!selectedTeam) return all
    const memberIds = new Set(selectedTeam.members.map((member) => member.employee_id))
    return all.filter((employee) => memberIds.has(employee.id))
  }, [directory.data, selectedTeam])

  const activeTaskCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of tasksQuery.data ?? []) {
      if (!task.assigned_employee_id || task.status === 'completed' || task.status === 'cancelled') continue
      counts.set(task.assigned_employee_id, (counts.get(task.assigned_employee_id) ?? 0) + 1)
    }
    return counts
  }, [tasksQuery.data])

  const members = useMemo(
    () =>
      employees
        .map((employee) => ({
          ...employee,
          booked: (employee.weekly_capacity_hours * employee.workload_percentage) / 100,
          status: getCapacityStatus(employee.workload_percentage),
        }))
        .sort((left, right) => right.workload_percentage - left.workload_percentage),
    [employees],
  )

  const skillCoverage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const employee of employees) {
      for (const skill of employee.skills) counts.set(skill.name, (counts.get(skill.name) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 6)
      .map(([name, value]) => ({ color: value <= 1 ? 'chart-3' : 'chart-1', name, value }))
  }, [employees])

  const capacity = members.reduce((sum, member) => sum + member.weekly_capacity_hours, 0)
  const booked = members.reduce((sum, member) => sum + member.booked, 0)
  const overLimit = members.filter((member) => member.status === 'over').length
  const isFiltered = directory.hasActiveFilters || selectedTeam !== null
  const hasTeams = teams.length > 0
  const chartState = directory.isLoading ? 'loading' : directory.error ? 'error' : employees.length === 0 ? 'empty' : 'ready'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <>
            <Button disabled={directory.isRefreshing} onClick={() => { void directory.refetch(); void tasksQuery.refetch() }} variant="secondary">
              {directory.isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            {isAdmin ? (
              <Link className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary-600 px-4 text-sm font-semibold text-text-on-primary no-underline hover:bg-primary-700" to="/organization/invitations">
                <Plus aria-hidden="true" size={16} />
                Invite member
              </Link>
            ) : null}
          </>
        }
        title="Team"
      />

      {hasTeams ? (
        <div aria-label="Filter by team" className="flex flex-wrap items-center gap-2" role="group">
          {[{ id: ALL_TEAMS, label: 'All teams' }, ...teams.map((team) => ({ id: team.id, label: team.name }))].map((option) => {
            const isSelected = option.id === selectedTeamId
            return (
              <button
                aria-pressed={isSelected}
                className={[
                  'min-h-9 rounded-full border px-3.5 text-sm font-medium',
                  isSelected
                    ? 'border-primary-600 bg-primary-600 text-text-on-primary'
                    : 'border-border-strong bg-surface-card text-text-secondary hover:text-text-primary',
                ].join(' ')}
                key={option.id}
                onClick={() => setSelectedTeamId(option.id)}
                type="button"
              >
                {option.label}
              </button>
            )
          })}
          {selectedTeam ? (
            <span className="helper text-text-tertiary">
              {selectedTeam.lead ? `Led by ${selectedTeam.lead.full_name}` : 'No lead assigned'}
              {selectedTeam.description ? ` · ${selectedTeam.description}` : ''}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
        <ChartCard
          emptyText="Skills appear once employees add them to their profiles."
          helper="People per skill · orange marks a skill only one person has"
          onRetry={() => { void directory.refetch() }}
          state={chartState === 'ready' && skillCoverage.length === 0 ? 'empty' : chartState}
          table={{
            columns: [{ key: 'name', label: 'Skill' }, { key: 'value', label: 'People' }],
            rows: skillCoverage.map((item) => ({ name: item.name, value: item.value })),
          }}
          title="Skills coverage"
        >
          <ColumnChart data={skillCoverage} />
        </ChartCard>

        <ChartCard
          emptyText="Capacity appears once employees join."
          helper={`Booked hours out of ${formatHours(capacity)}`}
          onRetry={() => { void directory.refetch() }}
          state={chartState}
          title="Capacity this week"
        >
          <div className="flex flex-wrap items-center gap-6">
            <RadialScore label="Team capacity booked" size={120} value={capacity === 0 ? 0 : (booked / capacity) * 100} />
            <dl className="body m-0 flex min-w-40 flex-1 flex-col gap-2.5">
              <div className="flex justify-between gap-2"><dt className="text-text-secondary">Booked</dt><dd className="num-sm m-0">{formatHours(booked)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-text-secondary">Free</dt><dd className="num-sm m-0">{formatHours(Math.max(0, capacity - booked))}</dd></div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-secondary">Over {HIGH_WORKLOAD_THRESHOLD}%</dt>
                <dd className={['num-sm m-0', overLimit > 0 ? 'text-danger-fg' : ''].join(' ')}>{overLimit} {overLimit === 1 ? 'person' : 'people'}</dd>
              </div>
            </dl>
          </div>
        </ChartCard>
      </div>

      <Card aria-labelledby="team-members-title" className="flex flex-col" padding="flush">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-5">
          <CardHeader
            helper={`${selectedTeam ? `${selectedTeam.name} · ` : ''}${isAdmin ? 'Employees, busiest first' : 'Busiest first'}`}
            id="team-members-title"
            title="Members"
          />
          <label className="label flex flex-col gap-1 text-text-secondary">
            Search
            <input
              className="body min-h-10 w-64 max-w-full rounded-control border border-border-strong bg-surface-card px-3 text-text-primary"
              onChange={(event) => directory.setSearch(event.target.value)}
              placeholder="Name"
              type="search"
              value={directory.filters.search}
            />
          </label>
        </div>
        {directory.isLoading ? <div className="px-5 pb-5"><StateBlock kind="loading" title="Loading members" /></div> : null}
        {directory.error ? (
          <StateBlock action={<Button onClick={() => { void directory.refetch() }} variant="secondary">Retry</Button>} kind="error">
            Team members could not be loaded.
          </StateBlock>
        ) : null}
        {!directory.isLoading && !directory.error && members.length === 0 ? (
          <StateBlock
            action={
              isFiltered ? (
                <Button onClick={() => { directory.resetFilters(); setSelectedTeamId(ALL_TEAMS) }} variant="secondary">
                  Clear filters
                </Button>
              ) : undefined
            }
            title={isFiltered ? 'No one matches these filters' : 'No employees yet'}
          >
            {isFiltered ? 'Try a different name or team.' : 'Employees appear here when they join this organization.'}
          </StateBlock>
        ) : null}
        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="body w-full min-w-[720px] border-collapse text-left">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="label px-5 py-2.5 text-text-secondary" scope="col">Name</th>
                  {hasTeams ? <th className="label px-3 py-2.5 text-text-secondary" scope="col">Team</th> : null}
                  <th className="label px-3 py-2.5 text-text-secondary" scope="col">Active tasks</th>
                  <th className="label px-3 py-2.5 text-text-secondary" scope="col">Hours</th>
                  <th className="label w-[28%] px-3 py-2.5 text-text-secondary" scope="col">Utilization</th>
                  <th className="label px-5 py-2.5 text-text-secondary" scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr className="border-t border-chart-grid" key={member.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.full_name} size={32} />
                        <div>
                          <div className="body-strong text-text-primary">{member.full_name}</div>
                          <div className="helper text-text-tertiary">
                            {member.employment_type === 'full_time' ? 'Full time' : 'Part time'}
                            {member.skills.length > 0 ? ` · ${member.skills.slice(0, 2).map((skill) => skill.name).join(', ')}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    {hasTeams ? (
                      <td className="body px-3 py-3 text-text-secondary">{teamNamesByEmployee.get(member.id)?.join(', ') ?? '–'}</td>
                    ) : null}
                    <td className="num-sm px-3 py-3">{tasksQuery.data ? activeTaskCounts.get(member.id) ?? 0 : '–'}</td>
                    <td className="num-sm px-3 py-3">{formatHours(member.booked)} / {formatHours(member.weekly_capacity_hours)}</td>
                    <td className="px-3 py-3">
                      <ProgressBar label={`${member.full_name} utilization`} tone={member.status === 'over' ? 'bad' : 'primary'} value={member.workload_percentage} />
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={member.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {isAdmin && activeOrganization ? <SupervisorList organizationId={activeOrganization.id} /> : null}
    </div>
  )
}

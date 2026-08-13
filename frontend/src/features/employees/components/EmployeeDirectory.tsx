import { ErrorState } from '../../../components/shared/ErrorState'
import { EmployeesEmptyState } from '../../../components/shared/EmptyState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useAssignableEmployees } from '../../tasks/hooks/useAssignableEmployees'

const inputClassName = 'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

function percent(value: number) {
  return `${Math.round(value)}%`
}

export function EmployeeDirectory() {
  const directory = useAssignableEmployees()
  const employees = directory.data ?? []

  return <div className="grid gap-6">
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-card p-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">Organization directory</p>
        <h2 className="mt-2 text-2xl font-bold text-ink-900">Employees</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">Review employee skills, capacity, availability, and workload before assigning work.</p>
      </div>
      <Button disabled={directory.isRefreshing} onClick={() => { void directory.refetch() }} variant="secondary">{directory.isRefreshing ? 'Refreshing...' : 'Refresh'}</Button>
    </section>

    <Card className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold text-ink-800">Search employee<input className={inputClassName} onChange={(event) => directory.setSearch(event.target.value)} placeholder="Name" value={directory.filters.search} /></label>
        <label className="grid gap-1 text-sm font-semibold text-ink-800">Skill<input className={inputClassName} onChange={(event) => directory.setSkill(event.target.value)} placeholder="React, SQL..." value={directory.filters.skill} /></label>
        <label className="grid gap-1 text-sm font-semibold text-ink-800">Minimum availability<input className={inputClassName} max="100" min="0" onChange={(event) => directory.setAvailabilityMin(event.target.value)} placeholder="0" type="number" value={directory.filters.availabilityMin} /></label>
        <label className="grid gap-1 text-sm font-semibold text-ink-800">Employment type<select className={inputClassName} onChange={(event) => directory.setEmploymentType(event.target.value as '' | 'full_time' | 'part_time')} value={directory.filters.employmentType}><option value="">All types</option><option value="full_time">Full time</option><option value="part_time">Part time</option></select></label>
      </div>
      {directory.hasActiveFilters ? <div><Button onClick={directory.resetFilters} type="button" variant="ghost">Clear filters</Button></div> : null}
    </Card>

    {directory.isLoading ? <LoadingState label="Loading employees..." /> : null}
    {!directory.isLoading && directory.error ? <ErrorState error={directory.error} onRetry={() => { void directory.refetch() }} title="Unable to load employees" /> : null}
    {!directory.isLoading && !directory.error && employees.length === 0 ? <EmployeesEmptyState description={directory.hasActiveFilters ? 'Adjust your filters to broaden the directory results.' : 'Employee profiles appear here when members join this organization.'} title={directory.hasActiveFilters ? 'No employees match these filters' : 'No employees yet'} /> : null}
    {!directory.isLoading && !directory.error && employees.length > 0 ? <section className="grid gap-4 lg:grid-cols-2">
      {employees.map((employee) => <Card className="grid gap-4" key={employee.id}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-ink-900">{employee.full_name}</h3><p className="mt-1 text-sm text-ink-600">{employee.employment_type === 'full_time' ? 'Full time' : 'Part time'} · {employee.weekly_capacity_hours} hrs/week</p></div><span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">{percent(employee.availability_percentage)} available</span></div>
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-surface-card-alt p-3 text-sm"><div><dt className="text-ink-500">Workload</dt><dd className="mt-1 font-semibold text-ink-900">{percent(employee.workload_percentage)}</dd></div><div><dt className="text-ink-500">Availability</dt><dd className="mt-1 font-semibold text-ink-900">{percent(employee.availability_percentage)}</dd></div><div><dt className="text-ink-500">Performance</dt><dd className="mt-1 font-semibold text-ink-900">{employee.performance_score === null ? '—' : employee.performance_score.toFixed(1)}</dd></div></dl>
        <div><p className="text-xs font-semibold uppercase tracking-normal text-ink-500">Skills</p><div className="mt-2 flex flex-wrap gap-2">{employee.skills.length ? employee.skills.map((skill) => <span className="rounded-full border border-border-subtle bg-surface-card-alt px-2.5 py-1 text-xs font-medium text-ink-700" key={skill.name}>{skill.name} · {skill.proficiency_level}/5</span>) : <span className="text-sm text-ink-500">No skills listed</span>}</div></div>
      </Card>)}
    </section> : null}
  </div>
}

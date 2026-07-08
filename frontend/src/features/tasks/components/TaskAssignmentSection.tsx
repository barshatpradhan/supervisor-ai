import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import type { useAssignableEmployees } from '../hooks/useAssignableEmployees'
import type { AssignableEmployee, TaskDisplay } from '../types/task'

interface TaskAssignmentSectionProps {
  assignmentError: string | null
  canSubmitAssignment: boolean
  directory: ReturnType<typeof useAssignableEmployees>
  isSubmitting: boolean
  onAssign: () => Promise<void>
  onSelectionChange: (employeeId: string) => void
  selectedEmployeeId: string
  task: TaskDisplay
}

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

function formatEmploymentType(value: AssignableEmployee['employment_type']) {
  return value === 'full_time' ? 'Full-time' : 'Part-time'
}

function formatPerformanceScore(value: number | null) {
  if (value === null) {
    return 'Not scored'
  }

  return `${Number(value).toFixed(value % 1 === 0 ? 0 : 1)} / 100`
}

function formatYearsOfExperience(value: number | null) {
  if (value === null) {
    return 'Experience not specified'
  }

  return `${value} yr${value === 1 ? '' : 's'}`
}

function getAssignmentActionLabel(task: TaskDisplay, selectedEmployeeId: string) {
  if (!selectedEmployeeId) {
    return 'Select an employee'
  }

  if (!task.assigned_employee_id) {
    return 'Assign task'
  }

  return selectedEmployeeId === task.assigned_employee_id
    ? 'Current assignee selected'
    : 'Reassign task'
}

export function TaskAssignmentSection({
  assignmentError,
  canSubmitAssignment,
  directory,
  isSubmitting,
  onAssign,
  onSelectionChange,
  selectedEmployeeId,
  task,
}: TaskAssignmentSectionProps) {
  const employees = directory.data ?? []

  return (
    <section className="space-y-5 rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Assignment
            </p>
            <h3 className="mt-2 text-lg font-bold text-ink-900">Assign or reassign task</h3>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-ink-600">
            Review live employee availability, workload, and skills before
            confirming the assignment.
          </p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-card px-4 py-3 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">Current assignee</p>
          <p className="mt-1">{task.assignedEmployeeLabel}</p>
        </div>
      </div>

      {assignmentError ? (
        <ErrorState message={assignmentError} title="Unable to update assignment" />
      ) : null}

      <div className="grid gap-4 md:grid-cols-1">
        <label className="grid gap-2 text-sm font-semibold text-ink-800">
          Search employee
          <input
            className={inputClassName}
            onChange={(event) => directory.setSearch(event.target.value)}
            placeholder="Search by name"
            type="search"
            value={directory.filters.search}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink-800">
          Filter by skill
          <input
            className={inputClassName}
            onChange={(event) => directory.setSkill(event.target.value)}
            placeholder="React, SQL, QA..."
            type="search"
            value={directory.filters.skill}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink-800">
          Minimum availability
          <input
            className={inputClassName}
            max="100"
            min="0"
            onChange={(event) => directory.setAvailabilityMin(event.target.value)}
            placeholder="0"
            step="1"
            type="number"
            value={directory.filters.availabilityMin}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-ink-800">
          Employment type
          <select
            className={inputClassName}
            onChange={(event) =>
              directory.setEmploymentType(
                event.target.value as '' | 'full_time' | 'part_time',
              )
            }
            value={directory.filters.employmentType}
          >
            <option value="">All types</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-600">
        <span>
          {directory.isRefreshing
            ? 'Refreshing employee directory...'
            : `${employees.length} employee match${employees.length === 1 ? '' : 'es'} found`}
        </span>
        {directory.hasActiveFilters ? (
          <Button onClick={directory.resetFilters} variant="ghost">
            Clear filters
          </Button>
        ) : null}
      </div>

      {directory.isLoading ? <LoadingState label="Loading assignable employees..." /> : null}

      {!directory.isLoading && directory.error ? (
        <ErrorState
          error={directory.error}
          onRetry={() => {
            void directory.refetch()
          }}
          title="Unable to load assignable employees"
        />
      ) : null}

      {!directory.isLoading && !directory.error && employees.length === 0 ? (
        <EmptyState
          description={
            directory.hasActiveFilters
              ? 'Adjust the current filters to broaden the employee directory results.'
              : 'No assignable employees are currently available for this task.'
          }
          title={
            directory.hasActiveFilters
              ? 'No employees match these filters'
              : 'No assignable employees'
          }
        />
      ) : null}

      {!directory.isLoading && !directory.error && employees.length > 0 ? (
        <fieldset className="grid gap-4" disabled={isSubmitting}>
          <legend className="sr-only">Select an employee to assign this task</legend>
          {employees.map((employee) => {
            const isSelected = selectedEmployeeId === employee.id
            const skillList = employee.skills.slice(0, 6)

            return (
              <label
                key={employee.id}
                className={[
                  'grid cursor-pointer gap-4 rounded-lg border bg-surface-card p-4 transition',
                  isSelected
                    ? 'border-primary-600 ring-3 ring-primary-100'
                    : 'border-border-subtle hover:border-primary-300',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <input
                    checked={isSelected}
                    className="mt-1 h-4 w-4 accent-primary-600"
                    name="task-assignee"
                    onChange={() => onSelectionChange(employee.id)}
                    type="radio"
                    value={employee.id}
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-ink-900">{employee.full_name}</p>
                        <p className="text-sm text-ink-600">
                          {formatEmploymentType(employee.employment_type)}
                        </p>
                      </div>
                      <div className="grid gap-2 text-right text-sm text-ink-700 sm:text-left">
                        <span className="rounded-full bg-success-bg px-3 py-1 font-semibold text-success-text">
                          {employee.availability_percentage}% available
                        </span>
                      </div>
                    </div>

                    <dl className="grid gap-3 text-sm text-ink-700 sm:grid-cols-2 2xl:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                          Workload
                        </dt>
                        <dd className="mt-1 font-medium text-ink-900">
                          {employee.workload_percentage}%
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                          Weekly capacity
                        </dt>
                        <dd className="mt-1 font-medium text-ink-900">
                          {employee.weekly_capacity_hours} hrs
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                          Performance
                        </dt>
                        <dd className="mt-1 font-medium text-ink-900">
                          {formatPerformanceScore(employee.performance_score)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">
                          Skills
                        </dt>
                        <dd className="mt-1 font-medium text-ink-900">
                          {employee.skills.length}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      {skillList.length > 0 ? (
                        skillList.map((skill) => (
                          <span
                            key={`${employee.id}-${skill.name}`}
                            className="rounded-full border border-border-subtle bg-surface-card-alt px-3 py-1 text-xs font-medium text-ink-700"
                          >
                            {skill.name}
                            <span className="text-ink-500">
                              {` · L${skill.proficiency_level} · ${formatYearsOfExperience(
                                skill.years_of_experience,
                              )}`}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-ink-500">No skills listed.</span>
                      )}
                    </div>
                  </div>
                </div>
              </label>
            )
          })}
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-end">
        <Button
          disabled={!canSubmitAssignment || isSubmitting}
          onClick={() => {
            void onAssign()
          }}
        >
          {isSubmitting
            ? 'Saving assignment...'
            : getAssignmentActionLabel(task, selectedEmployeeId)}
        </Button>
      </div>
    </section>
  )
}

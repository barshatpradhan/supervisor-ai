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
  'min-h-11 w-full min-w-0 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

const VISIBLE_SKILLS = 3

function formatEmploymentType(value: AssignableEmployee['employment_type']) {
  return value === 'full_time' ? 'Full-time' : 'Part-time'
}

function formatPerformanceScore(value: number | null) {
  if (value === null) {
    return 'Not scored'
  }

  return `${Number(value).toFixed(value % 1 === 0 ? 0 : 1)} / 100`
}

function formatSkillDetail(skill: AssignableEmployee['skills'][number]) {
  const years = skill.years_of_experience
  return years === null
    ? `Level ${skill.proficiency_level}`
    : `Level ${skill.proficiency_level}, ${years} yr${years === 1 ? '' : 's'}`
}

function availabilityTone(value: number) {
  if (value >= 50) return 'bg-success-bg text-success-text'
  if (value >= 20) return 'bg-warning-bg text-warning-text'
  return 'bg-danger-bg text-danger-fg'
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
    <section aria-label="Assign or reassign task" className="flex flex-col gap-4">
      <p className="text-sm text-ink-600">
        Current assignee:{' '}
        <span className="font-semibold text-ink-900">{task.assignedEmployeeLabel}</span>
      </p>

      {assignmentError ? (
        <ErrorState message={assignmentError} title="Unable to update assignment" />
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 grid gap-1.5 text-xs font-semibold text-ink-700">
          Search employee
          <input
            className={inputClassName}
            onChange={(event) => directory.setSearch(event.target.value)}
            placeholder="Search by name"
            type="search"
            value={directory.filters.search}
          />
        </label>

        <label className="col-span-2 grid gap-1.5 text-xs font-semibold text-ink-700">
          Filter by skill
          <input
            className={inputClassName}
            onChange={(event) => directory.setSkill(event.target.value)}
            placeholder="React, SQL, QA..."
            type="search"
            value={directory.filters.skill}
          />
        </label>

        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-700">
          Min. availability %
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

        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-700">
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

      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm text-ink-600">
        <span aria-live="polite">
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
        <fieldset
          className="-mx-1 flex max-h-[28rem] flex-col gap-2 overflow-y-auto px-1 py-1"
          disabled={isSubmitting}
        >
          <legend className="sr-only">Select an employee to assign this task</legend>
          {employees.map((employee) => {
            const isSelected = selectedEmployeeId === employee.id
            const isCurrent = task.assigned_employee_id === employee.id
            const visibleSkills = employee.skills.slice(0, VISIBLE_SKILLS)
            const hiddenSkills = employee.skills.slice(VISIBLE_SKILLS)

            return (
              <label
                key={employee.id}
                className={[
                  'flex cursor-pointer items-start gap-3 rounded-lg border bg-surface-card p-3 transition',
                  isSelected
                    ? 'border-primary-600 ring-3 ring-primary-100'
                    : 'border-border-subtle hover:border-primary-300',
                ].join(' ')}
              >
                <input
                  checked={isSelected}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
                  name="task-assignee"
                  onChange={() => onSelectionChange(employee.id)}
                  type="radio"
                  value={employee.id}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink-900">
                      <span className="truncate">{employee.full_name}</span>
                      {isCurrent ? (
                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${availabilityTone(employee.availability_percentage)}`}
                    >
                      {employee.availability_percentage}% available
                    </span>
                  </div>

                  <p className="text-xs leading-5 text-ink-600">
                    {formatEmploymentType(employee.employment_type)} · {employee.weekly_capacity_hours} h/week
                    {' · '}Workload {employee.workload_percentage}%
                    {' · '}Performance {formatPerformanceScore(employee.performance_score)}
                  </p>

                  {employee.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {visibleSkills.map((skill) => (
                        <span
                          key={`${employee.id}-${skill.name}`}
                          className="rounded-full border border-border-subtle bg-surface-card-alt px-2 py-0.5 text-xs text-ink-700"
                          title={formatSkillDetail(skill)}
                        >
                          {skill.name} · L{skill.proficiency_level}
                        </span>
                      ))}
                      {hiddenSkills.length > 0 ? (
                        <span
                          className="px-1 py-0.5 text-xs text-ink-500"
                          title={hiddenSkills.map((skill) => skill.name).join(', ')}
                        >
                          +{hiddenSkills.length} more
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-500">No skills listed.</p>
                  )}
                </div>
              </label>
            )
          })}
        </fieldset>
      ) : null}

      <Button
        className="w-full"
        disabled={!canSubmitAssignment || isSubmitting}
        onClick={() => {
          void onAssign()
        }}
      >
        {isSubmitting
          ? 'Saving assignment...'
          : getAssignmentActionLabel(task, selectedEmployeeId)}
      </Button>
    </section>
  )
}

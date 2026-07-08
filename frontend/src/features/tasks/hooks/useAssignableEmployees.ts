import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { listAssignableEmployees } from '../../../services/supervisors/supervisorService'
import type { BackendSupervisorEmployeeDirectoryQuery } from '../../../types/backend'
import type { TaskAssignmentFilterValues } from '../types/task'

const initialFilters: TaskAssignmentFilterValues = {
  availabilityMin: '',
  employmentType: '',
  search: '',
  skill: '',
}

function buildEmployeeDirectoryQuery(
  filters: TaskAssignmentFilterValues,
  deferredSearch: string,
  deferredSkill: string,
): BackendSupervisorEmployeeDirectoryQuery {
  const availabilityMin = filters.availabilityMin.trim()

  return {
    availability_min: availabilityMin ? Number(availabilityMin) : undefined,
    employment_type: filters.employmentType || undefined,
    search: deferredSearch || undefined,
    skill: deferredSkill || undefined,
  }
}

export function useAssignableEmployees(enabled = true) {
  const [filters, setFilters] = useState<TaskAssignmentFilterValues>(initialFilters)
  const deferredSearch = useDeferredValue(filters.search.trim())
  const deferredSkill = useDeferredValue(filters.skill.trim())

  const query = useMemo(
    () => buildEmployeeDirectoryQuery(filters, deferredSearch, deferredSkill),
    [deferredSearch, deferredSkill, filters],
  )

  const fetchEmployees = useCallback(() => listAssignableEmployees(query), [query])
  const resource = useApiResource(fetchEmployees, { enabled })

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    Boolean(filters.skill.trim()) ||
    Boolean(filters.availabilityMin.trim()) ||
    Boolean(filters.employmentType)

  function updateFilter<TKey extends keyof TaskAssignmentFilterValues>(
    key: TKey,
    value: TaskAssignmentFilterValues[TKey],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function resetFilters() {
    setFilters(initialFilters)
  }

  return {
    ...resource,
    filters,
    hasActiveFilters,
    resetFilters,
    setAvailabilityMin: (value: string) => updateFilter('availabilityMin', value),
    setEmploymentType: (value: TaskAssignmentFilterValues['employmentType']) =>
      updateFilter('employmentType', value),
    setSearch: (value: string) => updateFilter('search', value),
    setSkill: (value: string) => updateFilter('skill', value),
  }
}

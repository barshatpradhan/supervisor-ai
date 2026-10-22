import { useMemo } from 'react'
import { useAssignableEmployees } from './useAssignableEmployees'

/** Employee id → full name, from the employee directory managers can read. */
export function useEmployeeNames(enabled: boolean) {
  const directory = useAssignableEmployees(enabled)

  return useMemo(
    () => new Map((directory.data ?? []).map((employee) => [employee.id, employee.full_name] as const)),
    [directory.data],
  )
}

/** Employee id -> avatar ID (or null), from the same directory, so a face only appears beside its name. */
export function useEmployeeAvatars(enabled: boolean) {
  const directory = useAssignableEmployees(enabled)

  return useMemo(
    () => new Map((directory.data ?? []).map((employee) => [employee.id, employee.avatarVariant] as const)),
    [directory.data],
  )
}

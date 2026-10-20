import { useCallback } from 'react'
import { getEmployeeProfile } from '../services/employees/employeeService'
import { getSupervisorProfile } from '../services/supervisors/supervisorService'
import type { BackendOrganizationMembershipRole } from '../types/backend'
import { useApiResource } from './useApiResource'

/**
 * The signed-in person's name in the active workspace, from their employee or supervisor
 * profile. Null until it loads, or when no profile exists yet; callers fall back to the email.
 */
export function useCurrentUserName(role: BackendOrganizationMembershipRole | null, organizationId: string | null) {
  const fetchName = useCallback(async () => {
    const profile = role === 'employee' ? await getEmployeeProfile() : await getSupervisorProfile()
    return profile.full_name?.trim() || null
    // organizationId is a dependency so the name refreshes when the workspace changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, organizationId])

  const resource = useApiResource(fetchName, { enabled: Boolean(role && organizationId) })
  return resource.error ? null : resource.data
}

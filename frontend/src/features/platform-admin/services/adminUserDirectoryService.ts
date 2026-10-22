import type { BackendUserDirectoryPage } from '../../../types/backend'
import { getJson } from '../../../lib/api'
import type { UserDirectoryFilters } from '../types/userDirectory'

/** Platform-wide users grouped by organization then team, 10 per page. */
export function listUserDirectory(filters: UserDirectoryFilters) {
  const params = new URLSearchParams({ page: String(filters.page) })
  if (filters.organizationId) params.set('organizationId', filters.organizationId)
  if (filters.teamId) params.set('teamId', filters.teamId)
  if (filters.role) params.set('role', filters.role)
  if (filters.search.trim()) params.set('search', filters.search.trim())
  return getJson<BackendUserDirectoryPage>(`/admin/users/directory?${params.toString()}`)
}

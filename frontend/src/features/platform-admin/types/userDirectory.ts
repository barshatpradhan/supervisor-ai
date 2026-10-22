import type { BackendUserDirectoryRoleFilter } from '../../../types/backend'

export interface UserDirectoryFilters {
  /** An organization id, 'none' for users without one, or '' for all. */
  organizationId: string
  page: number
  role: BackendUserDirectoryRoleFilter | ''
  search: string
  /** A team id, 'none' for users without a team, or '' for all. */
  teamId: string
}

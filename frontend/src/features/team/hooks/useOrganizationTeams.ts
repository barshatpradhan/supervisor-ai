import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { listOrganizationTeams } from '../../organizations/services/organizationService'

/** Read-only teams with their lead and members. Empty when the org has none. */
export function useOrganizationTeams(organizationId: string | null) {
  return useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => listOrganizationTeams(organizationId as string),
    queryKey: organizationId ? queryKeys.team.teams(organizationId) : ['team', 'unselected', 'teams'],
    retry: 1,
    staleTime: 60_000,
  })
}

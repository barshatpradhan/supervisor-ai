import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { listOrganizationMembers } from '../../organizations/services/organizationService'

export function useOrganizationTeam(organizationId: string | null) {
  return useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => listOrganizationMembers(organizationId as string),
    queryKey: organizationId ? queryKeys.team.list(organizationId) : ['team', 'unselected'],
    retry: 1,
    staleTime: 30_000,
  })
}

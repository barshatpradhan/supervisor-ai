import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { listProjects } from '../services/projectService'

export function useProjects(organizationId: string | null) {
  return useQuery({
    enabled: Boolean(organizationId),
    queryFn: listProjects,
    queryKey: organizationId ? queryKeys.projects.list(organizationId) : ['projects', 'unselected'],
    retry: 1,
    staleTime: 30_000,
  })
}

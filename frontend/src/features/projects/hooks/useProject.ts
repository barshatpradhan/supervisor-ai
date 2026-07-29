import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { getProject } from '../services/projectService'

export function useProject(organizationId: string | null, projectId: string | undefined) {
  return useQuery({
    enabled: Boolean(organizationId && projectId),
    queryFn: () => getProject(projectId as string),
    queryKey:
      organizationId && projectId
        ? queryKeys.projects.detail(organizationId, projectId)
        : ['projects', 'unselected', projectId ?? 'missing'],
    retry: 1,
    staleTime: 30_000,
  })
}

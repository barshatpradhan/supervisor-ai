import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { listTasks } from '../../tasks/services/taskService'

export function useProjectAssignmentTasks(organizationId: string | null, projectId: string, enabled = true) {
  return useQuery({
    enabled: Boolean(organizationId && projectId && enabled),
    queryFn: listTasks,
    queryKey: organizationId
      ? queryKeys.tasks.project(organizationId, projectId)
      : ['tasks', 'unselected', projectId],
    retry: 1,
    staleTime: 15_000,
  })
}

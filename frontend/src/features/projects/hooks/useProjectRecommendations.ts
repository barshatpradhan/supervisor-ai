import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseApiError } from '../../../lib/api/errors'
import { queryKeys } from '../../../lib/api/queryKeys'
import {
  generateProjectRecommendations,
  getLatestProjectRecommendations,
} from '../../../services/recommendations/recommendationService'

export function useProjectRecommendations(organizationId: string | null, projectId: string | undefined) {
  return useQuery({
    enabled: Boolean(organizationId && projectId),
    queryFn: async () => {
      try {
        return await getLatestProjectRecommendations(projectId as string)
      } catch (error) {
        const parsed = parseApiError(error)
        if (parsed.statusCode === 404) return null
        throw parsed
      }
    },
    queryKey:
      organizationId && projectId
        ? queryKeys.recommendations.detail(organizationId, projectId)
        : ['recommendations', 'unselected', projectId ?? 'missing'],
    retry: 1,
    staleTime: 30_000,
  })
}

export function useGenerateProjectRecommendations(organizationId: string | null, projectId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => generateProjectRecommendations(projectId as string),
    onSuccess: async (result) => {
      if (!organizationId || !projectId) return
      const queryKey = queryKeys.recommendations.detail(organizationId, projectId)
      queryClient.setQueryData(queryKey, result)
      await queryClient.invalidateQueries({ queryKey })
    },
  })
}

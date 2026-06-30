import { useCallback } from 'react'
import { useApiResource } from './useApiResource'
import { getLatestProjectRecommendations } from '../services/recommendations/recommendationService'

export function useProjectRecommendations(projectId: string | undefined) {
  const fetchRecommendations = useCallback(() => {
    if (!projectId) {
      throw new Error('Project id is required.')
    }

    return getLatestProjectRecommendations(projectId)
  }, [projectId])

  return useApiResource(fetchRecommendations, { enabled: Boolean(projectId) })
}

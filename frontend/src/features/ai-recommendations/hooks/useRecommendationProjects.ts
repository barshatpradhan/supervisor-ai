import { useCallback } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { listRecommendationProjects } from '../services/recommendationService'

export function useRecommendationProjects(enabled = true) {
  const fetchProjects = useCallback(() => listRecommendationProjects(), [])
  return useApiResource(fetchProjects, { enabled })
}

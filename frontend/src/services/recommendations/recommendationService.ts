import type { BackendRecommendationResponse } from '../../types/backend'
import { getJson, postJson } from '../../lib/api'

export function getLatestProjectRecommendations(projectId: string) {
  return getJson<BackendRecommendationResponse>(`/projects/${projectId}/recommendations`)
}

export function generateProjectRecommendations(projectId: string) {
  return postJson<BackendRecommendationResponse>(`/projects/${projectId}/recommendations`)
}

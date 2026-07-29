import type { BackendRecommendationAssignmentResponse, BackendRecommendationResponse } from '../../types/backend'
import { getJson, postJson } from '../../lib/api'

export function getLatestProjectRecommendations(projectId: string) {
  return getJson<BackendRecommendationResponse>(`/projects/${projectId}/recommendations`)
}

export function generateProjectRecommendations(projectId: string) {
  return postJson<BackendRecommendationResponse>(`/projects/${projectId}/recommendations`)
}

export interface AssignRecommendationRequest {
  recommendationRunId: string
  employeeId: string
  taskId?: string
  task?: { title: string; description?: string; priority?: 'low' | 'medium' | 'high'; estimatedHours: number; dueDate?: string }
}

export function assignProjectRecommendation(projectId: string, request: AssignRecommendationRequest) {
  return postJson<BackendRecommendationAssignmentResponse, AssignRecommendationRequest>(
    `/projects/${projectId}/recommendations/assign`,
    request,
  )
}

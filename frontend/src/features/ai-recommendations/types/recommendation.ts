import type {
  BackendAssignableEmployee,
  BackendProjectDocumentWithAnalysis,
  BackendRecommendation,
  BackendRecommendationResponse,
} from '../../../types/backend'

export type RecommendationDocument = BackendProjectDocumentWithAnalysis
export type RecommendationRun = BackendRecommendationResponse
type RecommendationResult = BackendRecommendation
type RecommendationEmployeeMetrics = BackendAssignableEmployee

export interface RecommendationEmployeeCard {
  directoryEmployee: RecommendationEmployeeMetrics | null
  recommendation: RecommendationResult
}

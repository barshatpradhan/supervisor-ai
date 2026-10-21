import type {
  BackendAssignableEmployee,
  BackendProjectDocumentAnalysis,
  BackendProjectDocumentWithAnalysis,
  BackendRecommendation,
  BackendRecommendationResponse,
} from '../../../types/backend'

export type RecommendationAnalysis = BackendProjectDocumentAnalysis
export type RecommendationDocument = BackendProjectDocumentWithAnalysis
export type RecommendationRun = BackendRecommendationResponse
type RecommendationResult = BackendRecommendation
type RecommendationEmployeeMetrics = BackendAssignableEmployee

export interface RecommendationEmployeeCard {
  directoryEmployee: RecommendationEmployeeMetrics | null
  recommendation: RecommendationResult
}

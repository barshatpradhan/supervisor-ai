import type {
  BackendAssignableEmployee,
  BackendProject,
  BackendProjectDocumentAnalysis,
  BackendProjectDocumentWithAnalysis,
  BackendRecommendation,
  BackendRecommendationResponse,
} from '../../../types/backend'

export type RecommendationProject = BackendProject
export type RecommendationAnalysis = BackendProjectDocumentAnalysis
export type RecommendationDocument = BackendProjectDocumentWithAnalysis
export type RecommendationRun = BackendRecommendationResponse
export type RecommendationResult = BackendRecommendation
export type RecommendationEmployeeMetrics = BackendAssignableEmployee

export interface RecommendationEmployeeCard {
  directoryEmployee: RecommendationEmployeeMetrics | null
  recommendation: RecommendationResult
}

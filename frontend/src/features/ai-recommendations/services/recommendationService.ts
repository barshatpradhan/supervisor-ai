import { parseApiError } from '../../../lib/api'
import { listProjectDocuments } from '../../projects/services/projectDocumentService'
import { listProjects } from '../../projects/services/projectService'
import { generateProjectRecommendations } from '../../../services/recommendations/recommendationService'
import { getLatestProjectRecommendations } from '../../../services/recommendations/recommendationService'
import { listAssignableEmployees } from '../../../services/supervisors/supervisorService'

export function listRecommendationProjects() {
  return listProjects()
}

export function listRecommendationProjectDocuments(projectId: string) {
  return listProjectDocuments(projectId)
}

export function listRecommendationEmployees() {
  return listAssignableEmployees()
}

export function generateRecommendationsForProject(projectId: string) {
  return generateProjectRecommendations(projectId)
}

export async function getSavedRecommendationsForProject(projectId: string) {
  try {
    return await getLatestProjectRecommendations(projectId)
  } catch (caughtError) {
    const error = parseApiError(caughtError)

    if (error.statusCode === 404) {
      return null
    }

    throw error
  }
}

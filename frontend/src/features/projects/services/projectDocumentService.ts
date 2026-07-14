import { getJson, postFormData } from '../../../lib/api'
import type {
  BackendProjectDocumentUploadResponse,
  BackendProjectDocumentWithAnalysis,
} from '../../../types/backend'

export function listProjectDocuments(projectId: string) {
  return getJson<BackendProjectDocumentWithAnalysis[]>(`/projects/${projectId}/documents`)
}

export function getProjectDocument(projectId: string, documentId: string) {
  return getJson<BackendProjectDocumentWithAnalysis>(
    `/projects/${projectId}/documents/${documentId}`,
  )
}

export function uploadProjectDocument(projectId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return postFormData<BackendProjectDocumentUploadResponse>(
    `/projects/${projectId}/documents`,
    formData,
  )
}

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

interface UploadProjectDocumentOptions {
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export function uploadProjectDocument(
  projectId: string,
  file: File,
  options?: UploadProjectDocumentOptions,
) {
  const formData = new FormData()
  formData.append('file', file)

  return postFormData<BackendProjectDocumentUploadResponse>(
    `/projects/${projectId}/documents`,
    formData,
    {
      onUploadProgress: (event) => {
        if (event.total && options?.onProgress) {
          options.onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
      signal: options?.signal,
    },
  )
}

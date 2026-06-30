import type {
  BackendCreateProjectRequest,
  BackendProject,
  BackendProjectDocumentUploadResponse,
  BackendUpdateProjectRequest,
} from '../../types/backend'
import { getJson, patchJson, postFormData, postJson } from '../../lib/api'

export function listProjects() {
  return getJson<BackendProject[]>('/projects')
}

export function getProject(projectId: string) {
  return getJson<BackendProject>(`/projects/${projectId}`)
}

export function createProject(request: BackendCreateProjectRequest) {
  return postJson<BackendProject, BackendCreateProjectRequest>('/projects', request)
}

export function updateProject(projectId: string, request: BackendUpdateProjectRequest) {
  return patchJson<BackendProject, BackendUpdateProjectRequest>(
    `/projects/${projectId}`,
    request,
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

import type {
  BackendCreateProjectRequest,
  BackendProject,
  BackendUpdateProjectRequest,
} from '../../../types/backend'
import { deleteJson, getJson, patchJson, postJson } from '../../../lib/api'

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

export function deleteProject(projectId: string) {
  return deleteJson<undefined>(`/projects/${projectId}`)
}

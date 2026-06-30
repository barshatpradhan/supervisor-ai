import type {
  BackendCreateProjectRequest,
  BackendPriorityLevel,
  BackendProject,
  BackendProjectStatus,
  BackendUpdateProjectRequest,
} from '../../../types/backend'

export type Project = BackendProject
export type ProjectStatus = BackendProjectStatus
export type ProjectPriority = BackendPriorityLevel
export type CreateProjectRequest = BackendCreateProjectRequest
export type UpdateProjectRequest = BackendUpdateProjectRequest

export interface ProjectFormValues {
  description: string
  priority: ProjectPriority
  title: string
}

export interface ProjectFormErrors {
  description?: string
  title?: string
}

export type ProjectPanelMode = 'create' | 'edit' | 'view'

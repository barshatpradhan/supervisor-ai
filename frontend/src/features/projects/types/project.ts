import type {
  BackendPriorityLevel,
  BackendProject,
  BackendProjectStatus,
} from '../../../types/backend'

export type Project = BackendProject
export type ProjectStatus = BackendProjectStatus
export type ProjectPriority = BackendPriorityLevel

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

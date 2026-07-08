import type {
  BackendAssignableEmployee,
  BackendCreateTaskProgressRequest,
  BackendCreateTaskRequest,
  BackendPriorityLevel,
  BackendTask,
  BackendTaskProgress,
  BackendTaskStatus,
} from '../../../types/backend'

export type Task = BackendTask
export type TaskStatus = BackendTaskStatus
export type TaskPriority = BackendPriorityLevel
export type CreateTaskRequest = BackendCreateTaskRequest
export type CreateTaskProgressRequest = BackendCreateTaskProgressRequest
export type TaskProgress = BackendTaskProgress
export type AssignableEmployee = BackendAssignableEmployee

export interface TaskAssignmentFilterValues {
  availabilityMin: string
  employmentType: '' | 'full_time' | 'part_time'
  search: string
  skill: string
}

export interface TaskFormValues {
  description: string
  estimatedHours: string
  priority: TaskPriority
  projectId: string
  title: string
}

export interface TaskFormErrors {
  estimatedHours?: string
  projectId?: string
  title?: string
}

export interface TaskProgressFormValues {
  notes: string
  progressPercentage: string
  status: TaskStatus
}

export interface TaskProgressFormErrors {
  progressPercentage?: string
}

export interface TaskDisplay extends Task {
  assignedEmployeeLabel: string
  assignmentState: 'assigned' | 'self' | 'unassigned'
  projectLabel: string
}

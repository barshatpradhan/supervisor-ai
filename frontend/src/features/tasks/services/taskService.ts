import type {
  BackendAssignTaskRequest,
  BackendCreateTaskProgressRequest,
  BackendCreateTaskRequest,
  BackendTask,
  BackendTaskProgress,
} from '../../../types/backend'
import { getJson, patchJson, postJson } from '../../../lib/api'

export function listTasks() {
  return getJson<BackendTask[]>('/tasks')
}

export function createTask(request: BackendCreateTaskRequest) {
  return postJson<BackendTask, BackendCreateTaskRequest>('/tasks', request)
}

export function assignTask(taskId: string, request: BackendAssignTaskRequest) {
  return patchJson<BackendTask, BackendAssignTaskRequest>(`/tasks/${taskId}/assign`, request)
}

export function createTaskProgress(taskId: string, request: BackendCreateTaskProgressRequest) {
  return postJson<BackendTaskProgress, BackendCreateTaskProgressRequest>(
    `/tasks/${taskId}/progress`,
    request,
  )
}

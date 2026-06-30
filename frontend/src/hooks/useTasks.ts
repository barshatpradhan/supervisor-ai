import { useCallback } from 'react'
import { useApiResource } from './useApiResource'
import { listTasks } from '../services/tasks/taskService'

export function useTasks(enabled = true) {
  const fetchTasks = useCallback(() => listTasks(), [])
  return useApiResource(fetchTasks, { enabled })
}

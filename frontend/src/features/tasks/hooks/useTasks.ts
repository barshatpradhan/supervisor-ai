import { useCallback } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { listTasks } from '../services/taskService'

export function useTasks(enabled = true) {
  const fetchTasks = useCallback(() => listTasks(), [])
  return useApiResource(fetchTasks, { enabled })
}

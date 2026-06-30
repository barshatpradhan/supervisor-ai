import { useMemo } from 'react'
import type { BackendTask } from '../types/backend'
import { useTasks } from './useTasks'

export function useTask(taskId: string | undefined) {
  const tasksQuery = useTasks(Boolean(taskId))

  const task = useMemo<BackendTask | null>(() => {
    if (tasksQuery.data === null || !taskId) {
      return null
    }

    return tasksQuery.data.find((item) => item.id === taskId) ?? null
  }, [taskId, tasksQuery.data])

  return {
    ...tasksQuery,
    data: task,
  }
}

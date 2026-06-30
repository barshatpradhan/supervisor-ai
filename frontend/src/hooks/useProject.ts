import { useCallback } from 'react'
import { useApiResource } from './useApiResource'
import { getProject } from '../services/projects/projectService'

export function useProject(projectId: string | undefined) {
  const fetchProject = useCallback(() => {
    if (!projectId) {
      throw new Error('Project id is required.')
    }

    return getProject(projectId)
  }, [projectId])

  return useApiResource(fetchProject, { enabled: Boolean(projectId) })
}

import { useCallback } from 'react'
import { useApiResource } from './useApiResource'
import { listProjects } from '../services/projects/projectService'

export function useProjects(enabled = true) {
  const fetchProjects = useCallback(() => listProjects(), [])
  return useApiResource(fetchProjects, { enabled })
}

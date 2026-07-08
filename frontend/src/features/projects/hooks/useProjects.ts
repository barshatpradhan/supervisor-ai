import { useCallback } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { listProjects } from '../services/projectService'

export function useProjects(enabled = true) {
  const fetchProjects = useCallback(() => listProjects(), [])
  return useApiResource(fetchProjects, { enabled })
}

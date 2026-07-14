import { useCallback } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { listProjectDocuments } from '../services/projectDocumentService'

export function useProjectDocuments(projectId: string | undefined) {
  const fetchProjectDocuments = useCallback(() => {
    if (!projectId) {
      throw new Error('Project id is required.')
    }

    return listProjectDocuments(projectId)
  }, [projectId])

  return useApiResource(fetchProjectDocuments, { enabled: Boolean(projectId) })
}

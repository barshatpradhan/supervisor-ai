import { useCallback } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { getProjectDocument } from '../services/projectDocumentService'

export function useProjectDocument(projectId: string | undefined, documentId: string | null) {
  const fetchProjectDocument = useCallback(() => {
    if (!projectId || !documentId) {
      throw new Error('Project id and document id are required.')
    }

    return getProjectDocument(projectId, documentId)
  }, [documentId, projectId])

  return useApiResource(fetchProjectDocument, {
    enabled: Boolean(projectId && documentId),
  })
}

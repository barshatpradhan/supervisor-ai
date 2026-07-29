import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { listProjectDocuments } from '../services/projectDocumentService'

export function useProjectDocuments(organizationId: string | null, projectId: string | undefined) {
  return useQuery({
    enabled: Boolean(organizationId && projectId),
    queryFn: () => listProjectDocuments(projectId as string),
    queryKey:
      organizationId && projectId
        ? queryKeys.documents.list(organizationId, projectId)
        : ['documents', 'unselected', projectId ?? 'missing'],
    refetchInterval: (query) =>
      query.state.data?.some((entry) => entry.document.extraction_status === 'pending')
        ? 3_000
        : false,
    retry: 1,
    staleTime: 15_000,
  })
}

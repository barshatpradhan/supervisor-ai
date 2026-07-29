import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../lib/api/queryKeys'
import { getSupervisorDashboard } from '../services/dashboardService'

export function useSupervisorDashboard(organizationId: string | null) {
  return useQuery({
    enabled: Boolean(organizationId),
    queryFn: getSupervisorDashboard,
    queryKey: organizationId
      ? queryKeys.dashboard.supervisor(organizationId)
      : ['dashboard', 'supervisor', 'unselected'],
    retry: 1,
    staleTime: 30_000,
  })
}

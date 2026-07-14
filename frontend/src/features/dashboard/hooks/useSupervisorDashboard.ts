import { useCallback } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { getSupervisorDashboard } from '../services/dashboardService'

export function useSupervisorDashboard(enabled = true) {
  const fetchDashboard = useCallback(() => getSupervisorDashboard(), [])
  return useApiResource(fetchDashboard, { enabled })
}

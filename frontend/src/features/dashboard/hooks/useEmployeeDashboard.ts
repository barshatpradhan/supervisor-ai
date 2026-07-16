import { useCallback } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { getEmployeeDashboard } from '../services/dashboardService'

export function useEmployeeDashboard(enabled = true) {
  const fetchDashboard = useCallback(() => getEmployeeDashboard(), [])
  return useApiResource(fetchDashboard, { enabled })
}

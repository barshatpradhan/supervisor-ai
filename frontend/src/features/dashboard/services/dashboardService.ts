import { getJson } from '../../../lib/api'
import type { BackendSupervisorDashboardResponse } from '../../../types/backend'

export function getSupervisorDashboard() {
  return getJson<BackendSupervisorDashboardResponse>('/dashboard/supervisor')
}

import type { BackendDashboardMetrics } from '../../types/backend'
import { getJson } from '../../lib/api'

export function getDashboardMetrics() {
  return getJson<BackendDashboardMetrics>('/admin/dashboard')
}

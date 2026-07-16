import { getJson } from '../../../lib/api'
import type {
  BackendEmployeeDashboardResponse,
  BackendSupervisorDashboardResponse,
} from '../../../types/backend'

export function getSupervisorDashboard() {
  return getJson<BackendSupervisorDashboardResponse>('/dashboard/supervisor')
}

export function getEmployeeDashboard() {
  return getJson<BackendEmployeeDashboardResponse>('/dashboard/employee')
}

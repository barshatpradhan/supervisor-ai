import type {
  BackendAssignableEmployee,
  BackendCreateSupervisorProfileRequest,
  BackendEmployeeProfile,
  BackendSupervisorEmployeeDirectoryQuery,
  BackendSupervisorProfile,
  BackendUpdateSupervisorProfileRequest,
  BackendUpdateEmployeeWorkSettingsRequest,
} from '../../types/backend'
import { getJson, patchJson, postJson } from '../../lib/api'

export function getSupervisorProfile() {
  return getJson<BackendSupervisorProfile>('/supervisors/me')
}

export function listAssignableEmployees(query?: BackendSupervisorEmployeeDirectoryQuery) {
  return getJson<BackendAssignableEmployee[]>('/supervisors/employees', {
    params: query,
  })
}

export function createSupervisorProfile(request: BackendCreateSupervisorProfileRequest) {
  return postJson<BackendSupervisorProfile, BackendCreateSupervisorProfileRequest>(
    '/supervisors/profile',
    request,
  )
}

export function updateSupervisorProfile(request: BackendUpdateSupervisorProfileRequest) {
  return patchJson<BackendSupervisorProfile, BackendUpdateSupervisorProfileRequest>(
    '/supervisors/me',
    request,
  )
}

export function updateEmployeeWorkSettings(
  employeeId: string,
  request: BackendUpdateEmployeeWorkSettingsRequest,
) {
  return patchJson<BackendEmployeeProfile, BackendUpdateEmployeeWorkSettingsRequest>(
    `/supervisors/employees/${employeeId}/work-settings`,
    request,
  )
}

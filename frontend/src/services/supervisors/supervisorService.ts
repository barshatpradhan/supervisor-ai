import type {
  BackendCreateSupervisorProfileRequest,
  BackendEmployeeProfile,
  BackendSupervisorProfile,
  BackendUpdateEmployeeWorkSettingsRequest,
} from '../../types/backend'
import { getJson, patchJson, postJson } from '../../lib/api'

export function getSupervisorProfile() {
  return getJson<BackendSupervisorProfile>('/supervisors/me')
}

export function createSupervisorProfile(request: BackendCreateSupervisorProfileRequest) {
  return postJson<BackendSupervisorProfile, BackendCreateSupervisorProfileRequest>(
    '/supervisors/profile',
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

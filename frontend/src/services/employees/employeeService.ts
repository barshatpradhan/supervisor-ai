import type {
  BackendAdminUser,
  BackendApprovedSkill,
  BackendEmployeeProfile,
  BackendUpdateEmployeeProfileRequest,
} from '../../types/backend'
import { getJson, patchJson } from '../../lib/api'

export function listEmployeeUsers() {
  return getJson<BackendAdminUser[]>('/admin/users')
}

export function getApprovedSkills() {
  return getJson<BackendApprovedSkill[]>('/employees/skills')
}

export function getEmployeeProfile() {
  return getJson<BackendEmployeeProfile>('/employees/me')
}

export function updateEmployeeProfile(request: BackendUpdateEmployeeProfileRequest) {
  return patchJson<BackendEmployeeProfile, BackendUpdateEmployeeProfileRequest>(
    '/employees/me',
    request,
  )
}

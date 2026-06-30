import type {
  BackendAdminUser,
  BackendApprovedSkill,
  BackendCreateEmployeeProfileRequest,
  BackendEmployeeProfile,
  BackendUpdateEmployeeProfileRequest,
} from '../../types/backend'
import { getJson, patchJson, postJson } from '../../lib/api'

export function listEmployeeUsers() {
  return getJson<BackendAdminUser[]>('/admin/users')
}

export function getApprovedSkills() {
  return getJson<BackendApprovedSkill[]>('/employees/skills')
}

export function getEmployeeProfile() {
  return getJson<BackendEmployeeProfile>('/employees/me')
}

export function createEmployeeProfile(request: BackendCreateEmployeeProfileRequest) {
  return postJson<BackendEmployeeProfile, BackendCreateEmployeeProfileRequest>(
    '/employees/profile',
    request,
  )
}

export function updateEmployeeProfile(request: BackendUpdateEmployeeProfileRequest) {
  return patchJson<BackendEmployeeProfile, BackendUpdateEmployeeProfileRequest>(
    '/employees/me',
    request,
  )
}

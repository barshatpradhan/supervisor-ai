import { deleteJson, getJson, patchJson, postJson } from '../../../lib/api'
import type {
  BackendOrganizationMemberSummary,
  BackendOrganizationMembershipRole,
  BackendRoleChangePreview,
  BackendUnassignableOpenTask,
} from '../../../types/backend'

/** Organization-admin changes to member roles and teams. The server re-checks every rule. */

const base = (organizationId: string) => `/organizations/${organizationId}`

export function previewRoleChange(organizationId: string, membershipId: string, role: BackendOrganizationMembershipRole) {
  return getJson<BackendRoleChangePreview>(
    `${base(organizationId)}/members/${membershipId}/role-change-preview?role=${encodeURIComponent(role)}`,
  )
}

export function changeMemberRole(
  organizationId: string,
  membershipId: string,
  role: BackendOrganizationMembershipRole,
  fullName?: string,
) {
  return patchJson<BackendOrganizationMemberSummary>(`${base(organizationId)}/members/${membershipId}/role`, {
    role,
    ...(fullName ? { fullName } : {}),
  })
}

export interface TeamInput {
  name?: string
  description?: string
  /** null removes the lead; undefined leaves it unchanged. */
  leadSupervisorId?: string | null
}

export function createTeam(organizationId: string, input: TeamInput & { name: string }) {
  return postJson<{ id: string }>(`${base(organizationId)}/teams`, input)
}

export function updateTeam(organizationId: string, teamId: string, input: TeamInput) {
  return patchJson<{ id: string }>(`${base(organizationId)}/teams/${teamId}`, input)
}

export function deleteTeam(organizationId: string, teamId: string) {
  return deleteJson<{ id: string }>(`${base(organizationId)}/teams/${teamId}`)
}

export function addTeamMember(organizationId: string, teamId: string, employeeId: string) {
  return postJson<unknown>(`${base(organizationId)}/teams/${teamId}/members`, { employeeId })
}

export function removeTeamMember(organizationId: string, teamId: string, employeeId: string) {
  return deleteJson<unknown>(`${base(organizationId)}/teams/${teamId}/members/${employeeId}`)
}

export function moveTeamMember(organizationId: string, fromTeamId: string, employeeId: string, toTeamId: string) {
  return postJson<unknown>(`${base(organizationId)}/teams/${fromTeamId}/members/${employeeId}/move`, { toTeamId })
}

export function listUnassignableOpenTasks(organizationId: string) {
  return getJson<BackendUnassignableOpenTask[]>(`${base(organizationId)}/unassignable-open-tasks`)
}

import type { BackendPendingSkill } from '../../types/backend'
import { deleteJson, getJson, patchJson } from '../../lib/api'

export function listPendingSkills() {
  return getJson<BackendPendingSkill[]>('/admin/skills/pending')
}

export function approveSkill(skillId: string) {
  return patchJson<BackendPendingSkill>(`/admin/skills/${skillId}/approve`)
}

export function rejectSkill(skillId: string) {
  return deleteJson<null>(`/admin/skills/${skillId}`)
}

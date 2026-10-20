import type { BackendApproveSkillRequest, BackendPendingSkill } from '../../types/backend'
import { deleteJson, getJson, patchJson } from '../../lib/api'

export function listPendingSkills() {
  return getJson<BackendPendingSkill[]>('/admin/skills/pending')
}

/** Adds the skill to the catalog, optionally with a corrected name and category. */
export function approveSkill(skillId: string, corrections: BackendApproveSkillRequest = {}) {
  return patchJson<BackendPendingSkill, BackendApproveSkillRequest>(`/admin/skills/${skillId}/approve`, corrections)
}

export function rejectSkill(skillId: string) {
  return deleteJson<null>(`/admin/skills/${skillId}`)
}

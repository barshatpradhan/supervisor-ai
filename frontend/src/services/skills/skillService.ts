import type { BackendPublicApprovedSkill, BackendSkillResolution } from '../../types/backend'
import { getJson, postJson } from '../../lib/api'

export interface PublicApprovedSkillsQuery {
  category?: string
  search?: string
}

export function listPublicApprovedSkills(query: PublicApprovedSkillsQuery = {}) {
  const searchParams = new URLSearchParams()

  if (query.search) {
    searchParams.set('search', query.search)
  }

  if (query.category) {
    searchParams.set('category', query.category)
  }

  const suffix = searchParams.toString()

  return getJson<BackendPublicApprovedSkill[]>(
    suffix ? `/public/skills?${suffix}` : '/public/skills',
  )
}

/** Checks typed skills: catalog match, AI correction, or rejection. Nothing is saved. */
export function resolveSkills(names: string[]) {
  return postJson<BackendSkillResolution[], { names: string[] }>('/skills/resolve', { names })
}

export function listSkillCategories() {
  return getJson<string[]>('/public/skills/categories', { skipOrganizationContext: true })
}

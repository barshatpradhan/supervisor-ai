import type { BackendPublicApprovedSkill } from '../../types/backend'
import { getJson } from '../../lib/api'

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

import type {
  BackendApprovedSkill,
  BackendEmployeeProfile,
} from '../../../types/backend'

export interface EmployeeProfileFormValues {
  fullName: string
  bio: string
  skills: string[]
}

export interface EmployeeSkillDisplayItem {
  name: string
  normalizedName: string
}

export interface CategorizedEmployeeSkills {
  approved: EmployeeSkillDisplayItem[]
  pending: EmployeeSkillDisplayItem[]
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeSkillName(value: string) {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function dedupeSkillNames(skills: string[]) {
  const seen = new Set<string>()
  const uniqueSkills: string[] = []

  for (const skill of skills) {
    const normalizedDisplayName = normalizeWhitespace(skill)
    const normalizedSkillName = normalizeSkillName(normalizedDisplayName)

    if (!normalizedDisplayName || !normalizedSkillName || seen.has(normalizedSkillName)) {
      continue
    }

    seen.add(normalizedSkillName)
    uniqueSkills.push(normalizedDisplayName)
  }

  return uniqueSkills
}

export function buildEmployeeProfileFormValues(
  profile: BackendEmployeeProfile,
): EmployeeProfileFormValues {
  return {
    bio: profile.bio ?? '',
    fullName: profile.full_name,
    skills: dedupeSkillNames(profile.skills.map((skill) => skill.name)),
  }
}

export function areEmployeeProfileFormValuesEqual(
  left: EmployeeProfileFormValues,
  right: EmployeeProfileFormValues,
) {
  if (normalizeWhitespace(left.fullName) !== normalizeWhitespace(right.fullName)) {
    return false
  }

  if (normalizeWhitespace(left.bio) !== normalizeWhitespace(right.bio)) {
    return false
  }

  const leftSkills = dedupeSkillNames(left.skills)
  const rightSkills = dedupeSkillNames(right.skills)

  if (leftSkills.length !== rightSkills.length) {
    return false
  }

  return leftSkills.every((skill, index) => normalizeSkillName(skill) === normalizeSkillName(rightSkills[index] ?? ''))
}

export function categorizeEmployeeSkills(
  skills: string[],
  approvedSkills: BackendApprovedSkill[],
): CategorizedEmployeeSkills {
  const approvedSkillNames = new Set(
    approvedSkills.map((skill) => skill.normalizedName),
  )
  const categorized: CategorizedEmployeeSkills = {
    approved: [],
    pending: [],
  }

  for (const skill of dedupeSkillNames(skills)) {
    const normalizedName = normalizeSkillName(skill)
    const item = { name: skill, normalizedName }

    if (approvedSkillNames.has(normalizedName)) {
      categorized.approved.push(item)
      continue
    }

    categorized.pending.push(item)
  }

  return categorized
}

export function formatEmploymentType(
  employmentType: BackendEmployeeProfile['employment_type'],
) {
  return employmentType === 'full_time' ? 'Full-time' : 'Part-time'
}

export function buildOptimisticEmployeeProfile(
  profile: BackendEmployeeProfile,
  values: EmployeeProfileFormValues,
  approvedSkills: BackendApprovedSkill[],
): BackendEmployeeProfile {
  const approvedSkillNames = new Map(
    approvedSkills.map((skill) => [skill.normalizedName, skill]),
  )
  const existingSkillsByNormalizedName = new Map(
    profile.skills.map((skill) => [skill.normalizedName, skill]),
  )

  return {
    ...profile,
    bio: normalizeWhitespace(values.bio) || null,
    full_name: normalizeWhitespace(values.fullName),
    skills: dedupeSkillNames(values.skills).map((skillName) => {
      const normalizedName = normalizeSkillName(skillName)
      const existingSkill = existingSkillsByNormalizedName.get(normalizedName)
      const approvedSkill = approvedSkillNames.get(normalizedName)

      return {
        category: existingSkill?.category ?? approvedSkill?.category ?? null,
        id: existingSkill?.id ?? approvedSkill?.id ?? normalizedName,
        isApproved: approvedSkill?.isApproved ?? existingSkill?.isApproved ?? false,
        name: skillName,
        normalizedName,
        proficiencyLevel: existingSkill?.proficiencyLevel ?? 3,
        yearsOfExperience: existingSkill?.yearsOfExperience ?? null,
      }
    }),
  }
}

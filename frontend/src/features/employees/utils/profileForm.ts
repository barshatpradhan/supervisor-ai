import type {
  BackendApprovedSkill,
  BackendEmployeeProfile,
} from '../../../types/backend'

export interface EmployeeProfileFormValues {
  fullName: string
  jobTitle: string
  department: string
  bio: string
  skills: EmployeeProfileSkillFormValue[]
}

export interface EmployeeProfileSkillFormValue {
  name: string
  proficiencyLevel: number
  yearsOfExperience: string
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

export function dedupeProfileSkills(skills: EmployeeProfileSkillFormValue[]) {
  const seen = new Set<string>()
  return skills.flatMap((skill) => {
    const name = normalizeWhitespace(skill.name)
    const normalizedName = normalizeSkillName(name)
    if (!name || !normalizedName || seen.has(normalizedName)) return []
    seen.add(normalizedName)
    return [{
      name,
      proficiencyLevel: Math.min(5, Math.max(1, Math.round(skill.proficiencyLevel) || 3)),
      yearsOfExperience: skill.yearsOfExperience,
    }]
  })
}

export function buildEmployeeProfileFormValues(
  profile: BackendEmployeeProfile,
): EmployeeProfileFormValues {
  return {
    bio: profile.bio ?? '',
    jobTitle: profile.job_title ?? '',
    department: profile.department ?? '',
    fullName: profile.full_name,
    skills: dedupeProfileSkills(profile.skills.map((skill) => ({
      name: skill.name,
      proficiencyLevel: skill.proficiencyLevel,
      yearsOfExperience: skill.yearsOfExperience === null ? '' : String(skill.yearsOfExperience),
    }))),
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

  if (normalizeWhitespace(left.jobTitle) !== normalizeWhitespace(right.jobTitle)) return false
  if (normalizeWhitespace(left.department) !== normalizeWhitespace(right.department)) return false

  const leftSkills = dedupeProfileSkills(left.skills)
  const rightSkills = dedupeProfileSkills(right.skills)

  if (leftSkills.length !== rightSkills.length) {
    return false
  }

  return leftSkills.every((skill, index) => {
    const other = rightSkills[index]
    return other !== undefined && normalizeSkillName(skill.name) === normalizeSkillName(other.name) &&
      skill.proficiencyLevel === other.proficiencyLevel && skill.yearsOfExperience.trim() === other.yearsOfExperience.trim()
  })
}

export function categorizeEmployeeSkills(
  skills: EmployeeProfileSkillFormValue[],
  approvedSkills: BackendApprovedSkill[],
): CategorizedEmployeeSkills {
  const approvedSkillNames = new Set(
    approvedSkills.map((skill) => skill.normalizedName),
  )
  const categorized: CategorizedEmployeeSkills = {
    approved: [],
    pending: [],
  }

  for (const skill of dedupeProfileSkills(skills)) {
    const normalizedName = normalizeSkillName(skill.name)
    const item = { name: skill.name, normalizedName }

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
    job_title: normalizeWhitespace(values.jobTitle) || null,
    department: normalizeWhitespace(values.department) || null,
    full_name: normalizeWhitespace(values.fullName),
    skills: dedupeProfileSkills(values.skills).map((skillValue) => {
      const skillName = skillValue.name
      const normalizedName = normalizeSkillName(skillName)
      const existingSkill = existingSkillsByNormalizedName.get(normalizedName)
      const approvedSkill = approvedSkillNames.get(normalizedName)

      return {
        category: existingSkill?.category ?? approvedSkill?.category ?? null,
        id: existingSkill?.id ?? approvedSkill?.id ?? normalizedName,
        isApproved: approvedSkill?.isApproved ?? existingSkill?.isApproved ?? false,
        name: skillName,
        normalizedName,
        proficiencyLevel: skillValue.proficiencyLevel,
        yearsOfExperience: skillValue.yearsOfExperience.trim() ? Number(skillValue.yearsOfExperience) : null,
      }
    }),
  }
}

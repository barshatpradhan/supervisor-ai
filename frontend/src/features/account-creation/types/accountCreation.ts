import type {
  BackendCreateManagedUserRequest,
  BackendProvisioningSkillInput,
  BackendPublicApprovedSkill,
  SignupRequest,
} from '../../../types/backend'

export type EmploymentType = 'full_time' | 'part_time'
export type ManagedAccountRole = 'employee' | 'supervisor'

export interface SkillSelectionItem {
  category: string | null
  clientId: string
  isCustom: boolean
  name: string
  normalizedName: string
  proficiencyLevel: number
  yearsOfExperience: string
}

export interface EmployeeAccountFormValues {
  bio: string
  confirmPassword: string
  email: string
  employmentType: EmploymentType | ''
  fullName: string
  password: string
  reviewConfirmed: boolean
  selectedSkills: SkillSelectionItem[]
  weeklyCapacityHours: string
}

export interface AdminUserCreationValues {
  bio: string
  department: string
  email: string
  employmentType: EmploymentType | ''
  fullName: string
  reviewConfirmed: boolean
  role: ManagedAccountRole
  selectedSkills: SkillSelectionItem[]
  weeklyCapacityHours: string
}

export interface ApprovedSkillCatalogState {
  categories: string[]
  error: string | null
  filteredSkills: BackendPublicApprovedSkill[]
  isLoading: boolean
  retry: () => Promise<BackendPublicApprovedSkill[] | null>
  searchValue: string
  selectedCategory: string
  setSearchValue: (value: string) => void
  setSelectedCategory: (value: string) => void
  skills: BackendPublicApprovedSkill[]
}

export type EmployeeSignupValidationErrors = Partial<Record<
  | 'bio'
  | 'confirmPassword'
  | 'email'
  | 'employmentType'
  | 'fullName'
  | 'password'
  | 'reviewConfirmed'
  | 'weeklyCapacityHours'
  | `skill-${string}`
  | 'skills',
  string
>>

export type AdminUserCreationValidationErrors = Partial<Record<
  | 'bio'
  | 'department'
  | 'email'
  | 'employmentType'
  | 'fullName'
  | 'reviewConfirmed'
  | 'role'
  | 'weeklyCapacityHours'
  | `skill-${string}`
  | 'skills',
  string
>>

export interface EmployeeSignupReviewData {
  account: {
    email: string
    passwordLabel: string
  }
  profile: {
    bio: string
    employmentTypeLabel: string
    fullName: string
    weeklyCapacityHours: string
  }
  skills: SkillSelectionItem[]
}

export interface AdminUserCreationReviewData {
  account: {
    email: string
    roleLabel: string
  }
  profile: Array<{ label: string; value: string }>
  skills: SkillSelectionItem[]
}

export type AccountCreationStepStatus = 'complete' | 'current' | 'upcoming'

export interface AccountCreationStep {
  description: string
  id: string
  label: string
  status: AccountCreationStepStatus
}

export function buildProvisioningSkillPayload(
  skill: SkillSelectionItem,
): BackendProvisioningSkillInput {
  return {
    name: skill.name,
    proficiency_level: skill.proficiencyLevel,
    years_of_experience:
      skill.yearsOfExperience.trim().length === 0
        ? null
        : Number(skill.yearsOfExperience),
  }
}

export function buildEmployeeSignupPayload(
  values: EmployeeAccountFormValues,
): SignupRequest {
  return {
    bio: values.bio.trim() || undefined,
    email: values.email.trim(),
    employment_type: values.employmentType || undefined,
    full_name: values.fullName.trim(),
    password: values.password,
    skills: values.selectedSkills.map(buildProvisioningSkillPayload),
    weekly_capacity_hours:
      values.weeklyCapacityHours.trim().length === 0
        ? undefined
        : Number(values.weeklyCapacityHours),
  }
}

export function buildAdminUserPayload(
  values: AdminUserCreationValues,
): BackendCreateManagedUserRequest {
  return {
    bio: values.bio.trim() || undefined,
    department:
      values.role === 'supervisor' ? values.department.trim() || undefined : undefined,
    email: values.email.trim(),
    employment_type:
      values.role === 'employee' && values.employmentType
        ? values.employmentType
        : undefined,
    full_name: values.fullName.trim(),
    role: values.role,
    skills:
      values.role === 'employee'
        ? values.selectedSkills.map(buildProvisioningSkillPayload)
        : undefined,
    weekly_capacity_hours:
      values.role === 'employee' && values.weeklyCapacityHours.trim().length > 0
        ? Number(values.weeklyCapacityHours)
        : undefined,
  }
}

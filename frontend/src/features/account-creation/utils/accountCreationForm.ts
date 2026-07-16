import type { BackendPublicApprovedSkill } from '../../../types/backend'
import type {
  AccountCreationStep,
  AdminUserCreationReviewData,
  AdminUserCreationValidationErrors,
  AdminUserCreationValues,
  EmployeeAccountFormValues,
  EmployeeSignupReviewData,
  EmployeeSignupValidationErrors,
  ManagedAccountRole,
  SkillSelectionItem,
} from '../types/accountCreation'

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeSkillName(value: string) {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function createSelectedSkill(
  input: string,
  approvedSkill?: BackendPublicApprovedSkill,
): SkillSelectionItem {
  const displayName = normalizeWhitespace(approvedSkill?.name ?? input)
  const normalizedName = normalizeSkillName(displayName)

  return {
    category: approvedSkill?.category ?? null,
    clientId: `skill-${normalizedName || Date.now().toString()}`,
    isCustom: !approvedSkill,
    name: displayName,
    normalizedName,
    proficiencyLevel: 3,
    yearsOfExperience: '',
  }
}

export function hasDuplicateSkill(skills: SkillSelectionItem[], input: string) {
  const normalizedName = normalizeSkillName(input)
  return skills.some((skill) => skill.normalizedName === normalizedName)
}

export function removeSkill(skills: SkillSelectionItem[], clientId: string) {
  return skills.filter((skill) => skill.clientId !== clientId)
}

export function updateSkill(
  skills: SkillSelectionItem[],
  clientId: string,
  updater: (skill: SkillSelectionItem) => SkillSelectionItem,
) {
  return skills.map((skill) => (skill.clientId === clientId ? updater(skill) : skill))
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function validateWeeklyCapacity(value: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    return 'Weekly capacity hours are required.'
  }

  const parsedValue = Number(trimmedValue)

  if (!Number.isFinite(parsedValue) || parsedValue < 1 || parsedValue > 168) {
    return 'Weekly capacity hours must be between 1 and 168.'
  }

  return undefined
}

function validateSkillSelections(skills: SkillSelectionItem[]) {
  const errors: Record<string, string> = {}

  for (const skill of skills) {
    const yearsValue = skill.yearsOfExperience.trim()

    if (!Number.isInteger(skill.proficiencyLevel) || skill.proficiencyLevel < 1 || skill.proficiencyLevel > 5) {
      errors[`skill-${skill.clientId}`] = 'Skill proficiency must be between 1 and 5.'
      continue
    }

    if (yearsValue.length === 0) {
      continue
    }

    const parsedYears = Number(yearsValue)

    if (!Number.isFinite(parsedYears) || parsedYears < 0 || parsedYears > 80) {
      errors[`skill-${skill.clientId}`] =
        'Years of experience must be between 0 and 80.'
    }
  }

  return errors
}

export function validateEmployeeSignupStep(
  values: EmployeeAccountFormValues,
  stepIndex: number,
): EmployeeSignupValidationErrors {
  if (stepIndex === 0) {
    const errors: EmployeeSignupValidationErrors = {}

    if (!isValidEmail(values.email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (values.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    }

    if (values.confirmPassword !== values.password) {
      errors.confirmPassword = 'Passwords must match.'
    }

    return errors
  }

  if (stepIndex === 1) {
    const errors: EmployeeSignupValidationErrors = {}

    if (!normalizeWhitespace(values.fullName)) {
      errors.fullName = 'Full name is required.'
    }

    if (!values.employmentType) {
      errors.employmentType = 'Employment type is required.'
    }

    const weeklyCapacityError = validateWeeklyCapacity(values.weeklyCapacityHours)

    if (weeklyCapacityError) {
      errors.weeklyCapacityHours = weeklyCapacityError
    }

    if (values.bio.length > 800) {
      errors.bio = 'Bio must be 800 characters or fewer.'
    }

    return errors
  }

  if (stepIndex === 2) {
    return validateSkillSelections(values.selectedSkills)
  }

  if (stepIndex === 3 && !values.reviewConfirmed) {
    return {
      reviewConfirmed: 'Confirm the information before creating the account.',
    }
  }

  return {}
}

export function validateAdminUserCreationStep(
  values: AdminUserCreationValues,
  stepIndex: number,
): AdminUserCreationValidationErrors {
  if (stepIndex === 0) {
    const errors: AdminUserCreationValidationErrors = {}

    if (!isValidEmail(values.email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!values.role) {
      errors.role = 'Select which type of user you want to create.'
    }

    return errors
  }

  if (stepIndex === 1) {
    const errors: AdminUserCreationValidationErrors = {}

    if (!normalizeWhitespace(values.fullName)) {
      errors.fullName = 'Full name is required.'
    }

    if (values.bio.length > 800) {
      errors.bio = 'Bio must be 800 characters or fewer.'
    }

    if (values.role === 'employee') {
      if (!values.employmentType) {
        errors.employmentType = 'Employment type is required.'
      }

      const weeklyCapacityError = validateWeeklyCapacity(values.weeklyCapacityHours)

      if (weeklyCapacityError) {
        errors.weeklyCapacityHours = weeklyCapacityError
      }
    }

    if (values.role === 'supervisor' && !normalizeWhitespace(values.department)) {
      errors.department = 'Department is required for supervisors.'
    }

    return errors
  }

  if (values.role === 'employee' && stepIndex === 2) {
    return validateSkillSelections(values.selectedSkills)
  }

  const reviewStepIndex = values.role === 'employee' ? 3 : 2

  if (stepIndex === reviewStepIndex && !values.reviewConfirmed) {
    return {
      reviewConfirmed: 'Confirm the information before creating the user.',
    }
  }

  return {}
}

export function buildEmployeeSignupSteps(currentStepIndex: number): AccountCreationStep[] {
  return [
    {
      description: 'Email and password',
      id: 'account',
      label: 'Account',
      status: currentStepIndex > 0 ? 'complete' : currentStepIndex === 0 ? 'current' : 'upcoming',
    },
    {
      description: 'Profile details',
      id: 'profile',
      label: 'Profile',
      status: currentStepIndex > 1 ? 'complete' : currentStepIndex === 1 ? 'current' : 'upcoming',
    },
    {
      description: 'Skills and experience',
      id: 'skills',
      label: 'Skills',
      status: currentStepIndex > 2 ? 'complete' : currentStepIndex === 2 ? 'current' : 'upcoming',
    },
    {
      description: 'Review and submit',
      id: 'review',
      label: 'Review',
      status: currentStepIndex === 3 ? 'current' : currentStepIndex > 3 ? 'complete' : 'upcoming',
    },
  ]
}

export function buildAdminUserCreationSteps(
  currentStepIndex: number,
  role: ManagedAccountRole,
): AccountCreationStep[] {
  const steps: Array<{ description: string; id: string; label: string }> = [
    {
      description: 'Role and email',
      id: 'account',
      label: 'Account',
    },
    {
      description: role === 'employee' ? 'Profile and capacity' : 'Supervisor profile',
      id: 'profile',
      label: 'Profile',
    },
  ]

  if (role === 'employee') {
    steps.push({
      description: 'Skills and experience',
      id: 'skills',
      label: 'Skills',
    })
  }

  steps.push({
    description: 'Review and create',
    id: 'review',
    label: 'Review',
  })

  return steps.map((step, index) => ({
    ...step,
    status:
      currentStepIndex > index
        ? 'complete'
        : currentStepIndex === index
          ? 'current'
          : 'upcoming',
  }))
}

function formatEmploymentTypeLabel(value: '' | 'full_time' | 'part_time') {
  if (value === 'full_time') {
    return 'Full-time'
  }

  if (value === 'part_time') {
    return 'Part-time'
  }

  return 'Not selected'
}

export function buildEmployeeSignupReviewData(
  values: EmployeeAccountFormValues,
): EmployeeSignupReviewData {
  return {
    account: {
      email: values.email.trim(),
      passwordLabel: `${values.password.length} characters`,
    },
    profile: {
      bio: normalizeWhitespace(values.bio) || 'No bio provided',
      employmentTypeLabel: formatEmploymentTypeLabel(values.employmentType),
      fullName: normalizeWhitespace(values.fullName),
      weeklyCapacityHours: `${values.weeklyCapacityHours.trim()} hours`,
    },
    skills: values.selectedSkills,
  }
}

export function buildAdminUserCreationReviewData(
  values: AdminUserCreationValues,
): AdminUserCreationReviewData {
  const profile =
    values.role === 'employee'
      ? [
          { label: 'Full name', value: normalizeWhitespace(values.fullName) },
          { label: 'Employment type', value: formatEmploymentTypeLabel(values.employmentType) },
          { label: 'Weekly capacity', value: `${values.weeklyCapacityHours.trim()} hours` },
          {
            label: 'Bio',
            value: normalizeWhitespace(values.bio) || 'No bio provided',
          },
        ]
      : [
          { label: 'Full name', value: normalizeWhitespace(values.fullName) },
          { label: 'Department', value: normalizeWhitespace(values.department) },
          {
            label: 'Bio',
            value: normalizeWhitespace(values.bio) || 'No bio provided',
          },
        ]

  return {
    account: {
      email: values.email.trim(),
      roleLabel: values.role === 'employee' ? 'Employee' : 'Supervisor',
    },
    profile,
    skills: values.selectedSkills,
  }
}

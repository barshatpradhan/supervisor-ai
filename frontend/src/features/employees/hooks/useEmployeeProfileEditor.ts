import { useMemo, useState } from 'react'
import type {
  BackendEmployeeProfile,
  BackendUpdateEmployeeProfileRequest,
} from '../../../types/backend'
import { useEmployeeProfile } from '../../../hooks/useEmployeeProfile'
import { useNotifications } from '../../../hooks/useNotifications'
import { updateEmployeeProfile } from '../../../services/employees/employeeService'
import { useApprovedSkills } from './useApprovedSkills'
import {
  areEmployeeProfileFormValuesEqual,
  buildEmployeeProfileFormValues,
  buildOptimisticEmployeeProfile,
  categorizeEmployeeSkills,
  dedupeProfileSkills,
  normalizeSkillName,
} from '../utils/profileForm'
import type { EmployeeProfileFormValues } from '../utils/profileForm'

interface EmployeeProfileValidationErrors {
  bio?: string
  jobTitle?: string
  department?: string
  fullName?: string
  skillInput?: string
}

function buildUpdateRequest(
  currentProfile: BackendEmployeeProfile,
  values: EmployeeProfileFormValues,
): BackendUpdateEmployeeProfileRequest {
  const request: BackendUpdateEmployeeProfileRequest = {}
  const normalizedFullName = values.fullName.trim()
  const normalizedBio = values.bio.trim()
  const normalizedSkills = dedupeProfileSkills(values.skills)

  if (normalizedFullName !== currentProfile.full_name) {
    request.full_name = normalizedFullName
  }

  if (normalizedBio !== (currentProfile.bio ?? '').trim()) {
    request.bio = normalizedBio
  }

  if (values.jobTitle.trim() !== (currentProfile.job_title ?? '').trim()) {
    request.job_title = values.jobTitle.trim() || null
  }

  if (values.department.trim() !== (currentProfile.department ?? '').trim()) {
    request.department = values.department.trim() || null
  }

  const currentSkills = currentProfile.skills.map((skill) => ({
    name: skill.name,
    proficiencyLevel: skill.proficiencyLevel,
    yearsOfExperience: skill.yearsOfExperience === null ? '' : String(skill.yearsOfExperience),
  }))
  const haveSkillsChanged =
    normalizedSkills.length !== currentSkills.length ||
    normalizedSkills.some(
      (skill, index) =>
        normalizeSkillName(skill.name) !== normalizeSkillName(currentSkills[index]?.name ?? '') ||
        skill.proficiencyLevel !== currentSkills[index]?.proficiencyLevel ||
        skill.yearsOfExperience.trim() !== currentSkills[index]?.yearsOfExperience.trim(),
    )

  if (haveSkillsChanged) {
    request.skills = normalizedSkills.map((skill) => ({
      name: skill.name,
      proficiency_level: skill.proficiencyLevel,
      years_of_experience: skill.yearsOfExperience.trim() ? Number(skill.yearsOfExperience) : null,
    }))
  }

  return request
}

function validateProfileForm(
  currentProfile: BackendEmployeeProfile,
  values: EmployeeProfileFormValues,
): EmployeeProfileValidationErrors {
  const errors: EmployeeProfileValidationErrors = {}

  if (!values.fullName.trim()) {
    errors.fullName = 'Full name is required.'
  }

  if ((currentProfile.bio ?? '').trim().length > 0 && values.bio.trim().length === 0) {
    errors.bio =
      'Clearing the bio is not supported by the current backend. Replace it with updated text instead.'
  }

  for (const skill of values.skills) {
    if (!Number.isInteger(skill.proficiencyLevel) || skill.proficiencyLevel < 1 || skill.proficiencyLevel > 5) {
      errors.skillInput = 'Skill proficiency must be between 1 and 5.'
    }
    if (skill.yearsOfExperience.trim()) {
      const years = Number(skill.yearsOfExperience)
      if (!Number.isFinite(years) || years < 0 || years > 80) {
        errors.skillInput = 'Years of experience must be between 0 and 80.'
      }
    }
  }

  return errors
}

export function useEmployeeProfileEditor() {
  const { error, data: profile, isLoading, isRefreshing, refetch } = useEmployeeProfile()
  const {
    data: approvedSkills,
    error: approvedSkillsError,
    isLoading: isApprovedSkillsLoading,
  } = useApprovedSkills()
  const notifications = useNotifications()
  const [draftState, setDraftState] = useState<EmployeeProfileFormValues | null>(null)
  const [profileOverride, setProfileOverride] = useState<BackendEmployeeProfile | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [validationErrors, setValidationErrors] =
    useState<EmployeeProfileValidationErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const currentProfile = profileOverride ?? profile
  const approvedSkillsList = useMemo(() => approvedSkills ?? [], [approvedSkills])
  const draft = draftState ?? (currentProfile ? buildEmployeeProfileFormValues(currentProfile) : null)

  const initialValues = useMemo(
    () => (currentProfile ? buildEmployeeProfileFormValues(currentProfile) : null),
    [currentProfile],
  )

  const isDirty =
    draft !== null &&
    initialValues !== null &&
    !areEmployeeProfileFormValuesEqual(draft, initialValues)

  function updateDraft(
    updater: (current: EmployeeProfileFormValues) => EmployeeProfileFormValues,
  ) {
    setDraftState((current) => {
      const baseDraft = current ?? draft

      if (!baseDraft) {
        return current
      }

      return updater(baseDraft)
    })
  }

  const categorizedSkills = useMemo(
    () => categorizeEmployeeSkills(draft?.skills ?? [], approvedSkillsList),
    [approvedSkillsList, draft?.skills],
  )

  const availableSkillSuggestions = useMemo(() => {
    const selectedSkills = new Set(
      (draft?.skills ?? []).map((skill) => normalizeSkillName(skill.name)),
    )

    return approvedSkillsList
      .filter((skill) => !selectedSkills.has(skill.normalizedName))
      .map((skill) => skill.name)
  }, [approvedSkillsList, draft?.skills])

  async function saveProfile() {
    if (!currentProfile || !draft) {
      return
    }

    const errors = validateProfileForm(currentProfile, draft)
    setValidationErrors(errors)
    setSubmitError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    const request = buildUpdateRequest(currentProfile, draft)

    if (Object.keys(request).length === 0) {
      notifications.info({
        message: 'Your profile already matches the saved version.',
        title: 'No changes to save',
      })
      return
    }

    const previousProfile = currentProfile
    const optimisticProfile = buildOptimisticEmployeeProfile(
      currentProfile,
      draft,
      approvedSkillsList,
    )

    setIsSaving(true)
    setProfileOverride(optimisticProfile)

    try {
      const updatedProfile = await updateEmployeeProfile(request)
      setProfileOverride(updatedProfile)
      setDraftState(buildEmployeeProfileFormValues(updatedProfile))
      notifications.success({
        message: 'Your profile details have been updated.',
        title: 'Profile saved',
      })
    } catch (caughtError) {
      setProfileOverride(previousProfile)
      setSubmitError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to save your profile right now.',
      )
      notifications.error({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to save your profile right now.',
        title: 'Save failed',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function setFullName(value: string) {
    updateDraft((current) => ({
        ...current,
        fullName: value,
      }))

    setValidationErrors((current) => ({ ...current, fullName: undefined }))
  }

  function setBio(value: string) {
    updateDraft((current) => ({
        ...current,
        bio: value,
      }))

    setValidationErrors((current) => ({ ...current, bio: undefined }))
  }

  function setJobTitle(value: string) {
    updateDraft((current) => ({ ...current, jobTitle: value }))
  }

  function setDepartment(value: string) {
    updateDraft((current) => ({ ...current, department: value }))
  }

  function addSkill() {
    const normalizedInput = skillInput.trim()

    if (!normalizedInput) {
      setValidationErrors((current) => ({
        ...current,
        skillInput: 'Enter a skill name before adding it.',
      }))
      return
    }

    updateDraft((current) => ({
        ...current,
        skills: dedupeProfileSkills([...current.skills, { name: normalizedInput, proficiencyLevel: 3, yearsOfExperience: '' }]),
      }))
    setSkillInput('')
    setValidationErrors((current) => ({ ...current, skillInput: undefined }))
  }

  function removeSkill(skillName: string) {
    const normalizedSkill = normalizeSkillName(skillName)

    updateDraft((current) => ({
        ...current,
        skills: current.skills.filter(
          (skill) => normalizeSkillName(skill.name) !== normalizedSkill,
        ),
      }))
  }

  function updateSkill(skillName: string, updates: Partial<{ proficiencyLevel: number; yearsOfExperience: string }>) {
    const normalizedSkill = normalizeSkillName(skillName)
    updateDraft((current) => ({
      ...current,
      skills: current.skills.map((skill) => normalizeSkillName(skill.name) === normalizedSkill ? { ...skill, ...updates } : skill),
    }))
  }

  function resetForm() {
    if (!initialValues) {
      return
    }

    setDraftState(initialValues)
    setSkillInput('')
    setSubmitError(null)
    setValidationErrors({})
  }

  return {
    approvedSkills: approvedSkillsList,
    approvedSkillsError,
    availableSkillSuggestions,
    categorizedSkills,
    currentProfile,
    draft,
    error,
    isApprovedSkillsLoading,
    isDirty,
    isLoading,
    isMissingProfile: error?.statusCode === 404,
    isRefreshing,
    isSaving,
    refetch,
    removeSkill,
    resetForm,
    saveProfile,
    setBio,
    setJobTitle,
    setDepartment,
    setFullName,
    setSkillInput,
    updateSkill,
    skillInput,
    submitError,
    validationErrors,
    addSkill,
  }
}

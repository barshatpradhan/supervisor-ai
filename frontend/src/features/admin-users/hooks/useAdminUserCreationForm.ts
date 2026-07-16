import { useState } from 'react'
import { useNotifications } from '../../../hooks/useNotifications'
import { createManagedUser } from '../../../services/admin/adminUserService'
import { useApprovedSkillCatalog } from '../../account-creation/hooks/useApprovedSkillCatalog'
import { buildAdminUserPayload } from '../../account-creation/types/accountCreation'
import type { AdminUserCreationValues } from '../../account-creation/types/accountCreation'
import {
  buildAdminUserCreationReviewData,
  buildAdminUserCreationSteps,
  createSelectedSkill,
  hasDuplicateSkill,
  updateSkill,
  validateAdminUserCreationStep,
} from '../../account-creation/utils/accountCreationForm'

const initialValues: AdminUserCreationValues = {
  bio: '',
  department: '',
  email: '',
  employmentType: '',
  fullName: '',
  reviewConfirmed: false,
  role: 'employee',
  selectedSkills: [],
  weeklyCapacityHours: '40',
}

export function useAdminUserCreationForm() {
  const notifications = useNotifications()
  const [values, setValues] = useState<AdminUserCreationValues>(initialValues)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [customSkillInput, setCustomSkillInput] = useState('')
  const [validationErrors, setValidationErrors] = useState<
    ReturnType<typeof validateAdminUserCreationStep>
  >({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const approvedSkillCatalog = useApprovedSkillCatalog(values.selectedSkills)

  const steps = buildAdminUserCreationSteps(currentStepIndex, values.role)

  const approvedSkillsById = new Map(
    approvedSkillCatalog.filteredSkills.map((skill) => [skill.id, skill] as const),
  )

  const allApprovedSkillsByNormalizedName = new Map(
    approvedSkillCatalog.skills.map((skill) => [skill.normalizedName, skill] as const),
  )

  const reviewData = buildAdminUserCreationReviewData(values)

  function updateValue<Key extends keyof AdminUserCreationValues>(
    key: Key,
    nextValue: AdminUserCreationValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: nextValue }))
    setValidationErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError(null)

    if (key === 'role' && nextValue === 'supervisor' && currentStepIndex > 2) {
      setCurrentStepIndex(2)
    }
  }

  function updateSkillField(
    clientId: string,
    updater: Parameters<typeof updateSkill>[2],
  ) {
    setValues((current) => ({
      ...current,
      selectedSkills: updateSkill(current.selectedSkills, clientId, updater),
    }))
    setValidationErrors((current) => ({ ...current, [`skill-${clientId}`]: undefined }))
    setSubmitError(null)
  }

  function addApprovedSkill(skillId: string) {
    const approvedSkill = approvedSkillsById.get(skillId)

    if (!approvedSkill) {
      return
    }

    setValues((current) => ({
      ...current,
      selectedSkills: [...current.selectedSkills, createSelectedSkill(approvedSkill.name, approvedSkill)],
    }))
    setValidationErrors((current) => ({ ...current, skills: undefined }))
  }

  function addCustomSkill() {
    const trimmedSkill = customSkillInput.trim()

    if (!trimmedSkill) {
      setValidationErrors((current) => ({
        ...current,
        skills: 'Enter a skill name before adding it.',
      }))
      return
    }

    if (hasDuplicateSkill(values.selectedSkills, trimmedSkill)) {
      setValidationErrors((current) => ({
        ...current,
        skills: 'That skill is already selected.',
      }))
      return
    }

    const matchingApprovedSkill = allApprovedSkillsByNormalizedName.get(
      createSelectedSkill(trimmedSkill).normalizedName,
    )

    if (matchingApprovedSkill) {
      setValidationErrors((current) => ({
        ...current,
        skills: 'That skill already exists in the approved catalog. Select the approved version instead.',
      }))
      return
    }

    setValues((current) => ({
      ...current,
      selectedSkills: [...current.selectedSkills, createSelectedSkill(trimmedSkill)],
    }))
    setCustomSkillInput('')
    setValidationErrors((current) => ({ ...current, skills: undefined }))
  }

  function removeSelectedSkill(clientId: string) {
    setValues((current) => ({
      ...current,
      selectedSkills: current.selectedSkills.filter((skill) => skill.clientId !== clientId),
    }))
  }

  function goToNextStep() {
    const nextErrors = validateAdminUserCreationStep(values, currentStepIndex)
    setValidationErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  function goToPreviousStep() {
    setCurrentStepIndex((current) => Math.max(current - 1, 0))
  }

  async function submit() {
    const stepIndexes = values.role === 'employee' ? [0, 1, 2, 3] : [0, 1, 2]
    const combinedErrors = stepIndexes.reduce<Record<string, string>>((current, stepIndex) => {
      return {
        ...current,
        ...validateAdminUserCreationStep(values, stepIndex),
      }
    }, {})

    setValidationErrors(combinedErrors)

    if (Object.keys(combinedErrors).length > 0) {
      const firstInvalidStep = stepIndexes.find(
        (stepIndex) =>
          Object.keys(validateAdminUserCreationStep(values, stepIndex)).length > 0,
      )

      if (firstInvalidStep !== undefined) {
        setCurrentStepIndex(firstInvalidStep)
      }

      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await createManagedUser(buildAdminUserPayload(values))
      notifications.success({
        message: response.invitation_sent
          ? 'The account was created and the invitation email was sent.'
          : 'The account was created successfully.',
        title: `${values.role === 'employee' ? 'Employee' : 'Supervisor'} created`,
      })
      setValues(initialValues)
      setCurrentStepIndex(0)
      setCustomSkillInput('')
      setValidationErrors({})
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to create the user right now.'
      setSubmitError(message)
      notifications.error({
        message,
        title: 'User creation failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    addApprovedSkill,
    addCustomSkill,
    approvedSkillCatalog,
    currentStepIndex,
    customSkillInput,
    customSkillMessage:
      'Custom skills stay pending approval until a reviewer approves them in the skill moderation flow.',
    goToNextStep,
    goToPreviousStep,
    isSubmitting,
    removeSelectedSkill,
    reviewData,
    setCustomSkillInput,
    setReviewConfirmed: (value: boolean) => updateValue('reviewConfirmed', value),
    setValue: updateValue,
    setYearsOfExperience: (clientId: string, value: string) =>
      updateSkillField(clientId, (skill) => ({ ...skill, yearsOfExperience: value })),
    setProficiencyLevel: (clientId: string, value: number) =>
      updateSkillField(clientId, (skill) => ({ ...skill, proficiencyLevel: value })),
    steps,
    submit,
    submitError,
    validationErrors,
    values,
  }
}

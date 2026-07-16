import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../../hooks/useNotifications'
import { useApprovedSkillCatalog } from '../../account-creation/hooks/useApprovedSkillCatalog'
import {
  buildEmployeeSignupPayload,
  type EmployeeAccountFormValues,
} from '../../account-creation/types/accountCreation'
import {
  buildEmployeeSignupReviewData,
  buildEmployeeSignupSteps,
  createSelectedSkill,
  hasDuplicateSkill,
  updateSkill,
  validateEmployeeSignupStep,
} from '../../account-creation/utils/accountCreationForm'
import { useAuth } from './useAuth'

const initialValues: EmployeeAccountFormValues = {
  bio: '',
  confirmPassword: '',
  email: '',
  employmentType: '',
  fullName: '',
  password: '',
  reviewConfirmed: false,
  selectedSkills: [],
  weeklyCapacityHours: '40',
}

export function useEmployeeSignupForm() {
  const navigate = useNavigate()
  const notifications = useNotifications()
  const { signup } = useAuth()
  const [values, setValues] = useState<EmployeeAccountFormValues>(initialValues)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [customSkillInput, setCustomSkillInput] = useState('')
  const [validationErrors, setValidationErrors] = useState<
    ReturnType<typeof validateEmployeeSignupStep>
  >({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const approvedSkillCatalog = useApprovedSkillCatalog(values.selectedSkills)

  const approvedSkillsById = new Map(
    approvedSkillCatalog.filteredSkills.map((skill) => [skill.id, skill] as const),
  )

  const allApprovedSkillsByNormalizedName = new Map(
    approvedSkillCatalog.skills.map((skill) => [skill.normalizedName, skill] as const),
  )

  const steps = buildEmployeeSignupSteps(currentStepIndex)

  const reviewData = buildEmployeeSignupReviewData(values)

  function updateValue<Key extends keyof EmployeeAccountFormValues>(
    key: Key,
    nextValue: EmployeeAccountFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: nextValue }))
    setValidationErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError(null)
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
    const nextErrors = validateEmployeeSignupStep(values, currentStepIndex)
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
    const combinedErrors = {
      ...validateEmployeeSignupStep(values, 0),
      ...validateEmployeeSignupStep(values, 1),
      ...validateEmployeeSignupStep(values, 2),
      ...validateEmployeeSignupStep(values, 3),
    }

    setValidationErrors(combinedErrors)

    if (Object.keys(combinedErrors).length > 0) {
      const firstInvalidStep = [0, 1, 2, 3].find(
        (stepIndex) =>
          Object.keys(validateEmployeeSignupStep(values, stepIndex)).length > 0,
      )

      if (firstInvalidStep !== undefined) {
        setCurrentStepIndex(firstInvalidStep)
      }

      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await signup(buildEmployeeSignupPayload(values))
      notifications.success({
        message: 'Your employee account has been created and signed in.',
        title: 'Account created',
      })
      navigate('/dashboard')
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to create your account right now.'
      setSubmitError(message)
      notifications.error({
        message,
        title: 'Signup failed',
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
      'The backend will normalize and review custom skills after signup. Use them only when the approved catalog does not fit.',
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

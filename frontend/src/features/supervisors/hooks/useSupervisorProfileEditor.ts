import { useMemo, useState } from 'react'
import { useNotifications } from '../../../hooks/useNotifications'
import { useSupervisorProfile } from '../../../hooks/useSupervisorProfile'
import {
  createSupervisorProfile,
  updateSupervisorProfile,
} from '../../../services/supervisors/supervisorService'
import type {
  BackendSupervisorProfile,
  BackendUpdateSupervisorProfileRequest,
} from '../../../types/backend'

interface SupervisorProfileDraft {
  bio: string
  department: string
  fullName: string
}

interface SupervisorProfileValidationErrors {
  fullName?: string
}

function buildDraft(profile: BackendSupervisorProfile): SupervisorProfileDraft {
  return {
    bio: profile.bio ?? '',
    department: profile.department ?? '',
    fullName: profile.full_name,
  }
}

function buildUpdateRequest(
  profile: BackendSupervisorProfile,
  draft: SupervisorProfileDraft,
): BackendUpdateSupervisorProfileRequest {
  const request: BackendUpdateSupervisorProfileRequest = {}
  const normalizedFullName = draft.fullName.trim()
  const normalizedDepartment = draft.department.trim()
  const normalizedBio = draft.bio.trim()

  if (normalizedFullName !== profile.full_name) {
    request.full_name = normalizedFullName
  }

  if (normalizedDepartment !== (profile.department ?? '').trim()) {
    request.department = normalizedDepartment || null
  }

  if (normalizedBio !== (profile.bio ?? '').trim()) {
    request.bio = normalizedBio || null
  }

  return request
}

export function useSupervisorProfileEditor() {
  const { data, error, isLoading, isRefreshing, refetch } = useSupervisorProfile()
  const notifications = useNotifications()
  const [draftState, setDraftState] = useState<SupervisorProfileDraft | null>(null)
  const [profileOverride, setProfileOverride] = useState<BackendSupervisorProfile | null>(null)
  const [validationErrors, setValidationErrors] =
    useState<SupervisorProfileValidationErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const currentProfile = profileOverride ?? data
  const initialValues = useMemo(
    () => (currentProfile ? buildDraft(currentProfile) : null),
    [currentProfile],
  )
  const draft = draftState ?? initialValues ?? { bio: '', department: '', fullName: '' }
  const isDirty =
    Boolean(draft) &&
    Boolean(initialValues) &&
    JSON.stringify(draft) !== JSON.stringify(initialValues)

  function updateDraft(updater: (current: SupervisorProfileDraft) => SupervisorProfileDraft) {
    setDraftState((current) => {
      const baseDraft = current ?? draft

      if (!baseDraft) {
        return current
      }

      return updater(baseDraft)
    })
  }

  async function saveProfile() {
    if (!draft.fullName.trim()) {
      setValidationErrors({ fullName: 'Full name is required.' })
      return
    }

    setValidationErrors({})
    setSubmitError(null)

    if (!currentProfile) {
      setIsSaving(true)

      try {
        const createdProfile = await createSupervisorProfile({
          full_name: draft.fullName.trim(),
          department: draft.department.trim() || undefined,
          bio: draft.bio.trim() || undefined,
        })
        setProfileOverride(createdProfile)
        setDraftState(buildDraft(createdProfile))
        notifications.success({
          message: 'Your supervisor profile is ready to use in this organization.',
          title: 'Profile created',
        })
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to create the supervisor profile.'
        setSubmitError(message)
        notifications.error({ message, title: 'Profile creation failed' })
      } finally {
        setIsSaving(false)
      }

      return
    }

    const request = buildUpdateRequest(currentProfile, draft)

    if (Object.keys(request).length === 0) {
      notifications.info({
        message: 'Your supervisor profile already matches the saved version.',
        title: 'No changes to save',
      })
      return
    }

    setIsSaving(true)

    try {
      const updatedProfile = await updateSupervisorProfile(request)
      setProfileOverride(updatedProfile)
      setDraftState(buildDraft(updatedProfile))
      notifications.success({
        message: 'Your supervisor profile has been updated.',
        title: 'Profile saved',
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to save the supervisor profile.'

      setSubmitError(message)
      notifications.error({
        message,
        title: 'Save failed',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function resetForm() {
    if (!initialValues) {
      return
    }

    setDraftState(initialValues)
    setSubmitError(null)
    setValidationErrors({})
  }

  return {
    currentProfile,
    draft,
    error: currentProfile ? null : error,
    isDirty,
    isLoading,
    isMissingProfile: !currentProfile && error?.statusCode === 404,
    isRefreshing,
    isSaving,
    refetch,
    resetForm,
    saveProfile,
    setBio: (value: string) =>
      updateDraft((current) => ({
        ...current,
        bio: value,
      })),
    setDepartment: (value: string) =>
      updateDraft((current) => ({
        ...current,
        department: value,
      })),
    setFullName: (value: string) => {
      updateDraft((current) => ({
        ...current,
        fullName: value,
      }))
      setValidationErrors((current) => ({ ...current, fullName: undefined }))
    },
    submitError,
    validationErrors,
  }
}

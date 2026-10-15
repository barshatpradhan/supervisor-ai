import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { Button } from '../../../components/ui/Button'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog } from '../../../components/ui/Dialog'
import { fieldErrorClass, fieldInputClass, fieldLabelClass } from '../../../components/ui/fieldStyles'
import { useNotifications } from '../../../hooks/useNotifications'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { useCreateInvitation } from '../hooks/useCreateInvitation'
import type {
  CreateOrganizationInvitationRequest,
  InviteMemberFormErrors,
  InviteMemberFormValues,
  OrganizationInvitationMutationResponse,
} from '../types/invitation'

interface InviteMemberDialogProps {
  isOpen: boolean
  onCancel: () => void
  onSuccess: (result: OrganizationInvitationMutationResponse) => void
}

function createInitialValues(): InviteMemberFormValues {
  return {
    bio: '',
    department: '',
    email: '',
    employmentType: '',
    fullName: '',
    jobTitle: '',
    role: 'employee',
    weeklyCapacityHours: '',
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function validateForm(values: InviteMemberFormValues): InviteMemberFormErrors {
  const errors: InviteMemberFormErrors = {}
  const normalizedEmail = normalizeEmail(values.email)

  if (!normalizedEmail) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.role) {
    errors.role = 'Role is required.'
  }

  if (!values.fullName.trim()) {
    errors.fullName = 'Full name is required.'
  }

  if (values.role === 'employee' && values.weeklyCapacityHours.trim()) {
    const capacity = Number(values.weeklyCapacityHours)

    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 168) {
      errors.weeklyCapacityHours = 'Weekly capacity hours must be between 1 and 168.'
    }
  }

  return errors
}

function buildRequest(values: InviteMemberFormValues): CreateOrganizationInvitationRequest {
  const normalizedEmail = normalizeEmail(values.email)

  if (values.role === 'employee') {
    return {
      email: normalizedEmail,
      role: 'employee',
      profile: {
        full_name: values.fullName.trim(),
        ...(values.jobTitle.trim() ? { job_title: values.jobTitle.trim() } : {}),
        ...(values.department.trim() ? { department: values.department.trim() } : {}),
        ...(values.bio.trim() ? { bio: values.bio.trim() } : {}),
        ...(values.employmentType ? { employment_type: values.employmentType } : {}),
        ...(values.weeklyCapacityHours.trim()
          ? { weekly_capacity_hours: Number(values.weeklyCapacityHours) }
          : {}),
      },
    }
  }

  return {
    email: normalizedEmail,
    role: 'supervisor',
    profile: {
      full_name: values.fullName.trim(),
      ...(values.department.trim() ? { department: values.department.trim() } : {}),
      ...(values.bio.trim() ? { bio: values.bio.trim() } : {}),
    },
  }
}

export function InviteMemberDialog({
  isOpen,
  onCancel,
  onSuccess,
}: InviteMemberDialogProps) {
  const notifications = useNotifications()
  const { activeMembershipRole, activeOrganization } = useOrganization()
  const { clearError, createInvitation, error, isSubmitting } = useCreateInvitation(
    activeOrganization?.id ?? null,
  )
  const [values, setValues] = useState<InviteMemberFormValues>(createInitialValues)
  const [fieldErrors, setFieldErrors] = useState<InviteMemberFormErrors>({})

  const canInvite = activeMembershipRole === 'organization_admin'
  const title = useMemo(
    () =>
      values.role === 'employee' ? 'Invite an employee' : 'Invite a supervisor',
    [values.role],
  )

  function resetForm() {
    setValues(createInitialValues())
    setFieldErrors({})
    clearError()
  }

  function handleCancel() {
    resetForm()
    onCancel()
  }

  function updateValue<K extends keyof InviteMemberFormValues>(
    key: K,
    nextValue: InviteMemberFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [key]: nextValue,
    }))
    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }))
    if (error) {
      clearError()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canInvite || isSubmitting) {
      return
    }

    const nextFieldErrors = validateForm(values)

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    try {
      const result = await createInvitation(buildRequest(values))
      notifications.success({
        message: `Invitation sent to ${normalizeEmail(values.email)}.`,
        title: 'Invitation created',
      })
      resetForm()
      onSuccess(result)
    } catch (caughtError) {
      notifications.error({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to create the invitation.',
        title: 'Invitation failed',
      })
    }
  }

  if (!canInvite) {
    return null
  }

  return (
    <DialogPrimitive.Root
      onOpenChange={(open) => {
        if (!open) handleCancel()
      }}
      open={isOpen}
    >
      <Dialog description="They get an email link to join this workspace." title={title}>
        <div className="grid gap-5">
          {error ? <ErrorState message={error} title="Unable to create invitation" /> : null}

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className={fieldLabelClass}>
              Email
              <input
                className={fieldInputClass}
                onChange={(event) => updateValue('email', event.target.value)}
                placeholder="person@example.com"
                required
                type="email"
                value={values.email}
              />
              {fieldErrors.email ? <span className={fieldErrorClass}>{fieldErrors.email}</span> : null}
            </label>

            <label className={fieldLabelClass}>
              Role
              <select
                className={fieldInputClass}
                onChange={(event) =>
                  updateValue('role', event.target.value as InviteMemberFormValues['role'])
                }
                value={values.role}
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
              </select>
              {fieldErrors.role ? <span className={fieldErrorClass}>{fieldErrors.role}</span> : null}
            </label>

            <label className={`${fieldLabelClass} md:col-span-2`}>
              Full name
              <input
                className={fieldInputClass}
                onChange={(event) => updateValue('fullName', event.target.value)}
                placeholder="Jordan Lee"
                required
                type="text"
                value={values.fullName}
              />
              {fieldErrors.fullName ? (
                <span className={fieldErrorClass}>{fieldErrors.fullName}</span>
              ) : null}
            </label>

            {values.role === 'employee' ? (
              <>
                <label className={fieldLabelClass}>
                  Job title
                  <input
                    className={fieldInputClass}
                    onChange={(event) => updateValue('jobTitle', event.target.value)}
                    placeholder="Senior Frontend Engineer"
                    type="text"
                    value={values.jobTitle}
                  />
                </label>
                <label className={fieldLabelClass}>
                  Department
                  <input
                    className={fieldInputClass}
                    onChange={(event) => updateValue('department', event.target.value)}
                    placeholder="Product Engineering"
                    type="text"
                    value={values.department}
                  />
                </label>
              </>
            ) : null}

            <label className={`${fieldLabelClass} md:col-span-2`}>
              Bio
              <textarea
                className={`${fieldInputClass} min-h-20 py-2.5`}
                onChange={(event) => updateValue('bio', event.target.value)}
                placeholder="Optional profile bio"
                value={values.bio}
              />
            </label>

            {values.role === 'employee' ? (
              <>
                <label className={fieldLabelClass}>
                  Employment type
                  <select
                    className={fieldInputClass}
                    onChange={(event) =>
                      updateValue(
                        'employmentType',
                        event.target.value as InviteMemberFormValues['employmentType'],
                      )
                    }
                    value={values.employmentType}
                  >
                    <option value="">Select employment type</option>
                    <option value="full_time">Full time</option>
                    <option value="part_time">Part time</option>
                  </select>
                </label>

                <label className={fieldLabelClass}>
                  Weekly capacity hours
                  <input
                    className={fieldInputClass}
                    inputMode="numeric"
                    max={168}
                    min={1}
                    onChange={(event) => updateValue('weeklyCapacityHours', event.target.value)}
                    placeholder="40"
                    type="number"
                    value={values.weeklyCapacityHours}
                  />
                  {fieldErrors.weeklyCapacityHours ? (
                    <span className={fieldErrorClass}>
                      {fieldErrors.weeklyCapacityHours}
                    </span>
                  ) : null}
                </label>
              </>
            ) : (
              <label className={`${fieldLabelClass} md:col-span-2`}>
                Department
                <input
                  className={fieldInputClass}
                  onChange={(event) => updateValue('department', event.target.value)}
                  placeholder="Engineering"
                  type="text"
                  value={values.department}
                />
              </label>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-chart-grid pt-4 sm:flex-row sm:justify-end md:col-span-2">
              <Button onClick={handleCancel} type="button" variant="secondary">
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Sending invitation...' : 'Send invitation'}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </DialogPrimitive.Root>
  )
}

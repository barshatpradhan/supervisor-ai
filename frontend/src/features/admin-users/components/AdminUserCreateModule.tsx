import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { EmptyState } from '../../../components/shared/EmptyState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { AccountCreationStepIndicator } from '../../account-creation/components/AccountCreationStepIndicator'
import { ProvisioningSkillStep } from '../../account-creation/components/ProvisioningSkillStep'
import { useAdminUserCreationForm } from '../hooks/useAdminUserCreationForm'

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

const textAreaClassName = `${inputClassName} min-h-32 py-3`

export function AdminUserCreateModule() {
  const form = useAdminUserCreationForm()
  const {
    addApprovedSkill,
    addCustomSkill,
    approvedSkillCatalog,
    currentStepIndex,
    customSkillInput,
    customSkillMessage,
    goToNextStep,
    goToPreviousStep,
    isSubmitting,
    removeSelectedSkill,
    reviewData,
    setCustomSkillInput,
    setProficiencyLevel,
    setReviewConfirmed,
    setValue,
    setYearsOfExperience,
    steps,
    submit,
    submitError,
    validationErrors,
    values,
  } = form

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (currentStepIndex === steps.length - 1) {
      await submit()
      return
    }

    goToNextStep()
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <AccountCreationStepIndicator
        currentStepLabel={steps[currentStepIndex]?.label ?? 'Account'}
        steps={steps}
      />

      {submitError ? (
        <ErrorState message={submitError} title="Unable to create the user" />
      ) : null}

      {currentStepIndex === 0 ? (
        <Card className="grid gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Step 1
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">Choose the account type</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Admin provisioning supports employees and supervisors only.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              User role
              <select
                aria-describedby={validationErrors.role ? 'admin-role-error' : undefined}
                aria-invalid={Boolean(validationErrors.role)}
                className={inputClassName}
                onChange={(event) =>
                  setValue('role', event.target.value as 'employee' | 'supervisor')
                }
                value={values.role}
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
              </select>
              {validationErrors.role ? (
                <span className="text-sm font-medium text-danger-700" id="admin-role-error">
                  {validationErrors.role}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Email
              <input
                aria-describedby={validationErrors.email ? 'admin-email-error' : undefined}
                aria-invalid={Boolean(validationErrors.email)}
                className={inputClassName}
                onChange={(event) => setValue('email', event.target.value)}
                placeholder="new.user@example.com"
                required
                type="email"
                value={values.email}
              />
              {validationErrors.email ? (
                <span className="text-sm font-medium text-danger-700" id="admin-email-error">
                  {validationErrors.email}
                </span>
              ) : null}
            </label>
          </div>
        </Card>
      ) : null}

      {currentStepIndex === 1 ? (
        <Card className="grid gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Step 2
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">Capture profile information</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Only user-provided profile fields are collected here. System-managed
              metrics stay protected.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Full name
              <input
                aria-describedby={validationErrors.fullName ? 'admin-full-name-error' : undefined}
                aria-invalid={Boolean(validationErrors.fullName)}
                className={inputClassName}
                onChange={(event) => setValue('fullName', event.target.value)}
                placeholder={values.role === 'employee' ? 'Employee name' : 'Supervisor name'}
                required
                type="text"
                value={values.fullName}
              />
              {validationErrors.fullName ? (
                <span className="text-sm font-medium text-danger-700" id="admin-full-name-error">
                  {validationErrors.fullName}
                </span>
              ) : null}
            </label>

            {values.role === 'employee' ? (
              <>
                <label className="grid gap-2 text-sm font-semibold text-ink-800">
                  Employment type
                  <select
                    aria-describedby={
                      validationErrors.employmentType ? 'admin-employment-type-error' : undefined
                    }
                    aria-invalid={Boolean(validationErrors.employmentType)}
                    className={inputClassName}
                    onChange={(event) =>
                      setValue(
                        'employmentType',
                        event.target.value as 'full_time' | 'part_time' | '',
                      )
                    }
                    value={values.employmentType}
                  >
                    <option value="">Select employment type</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                  </select>
                  {validationErrors.employmentType ? (
                    <span
                      className="text-sm font-medium text-danger-700"
                      id="admin-employment-type-error"
                    >
                      {validationErrors.employmentType}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-semibold text-ink-800">
                  Weekly capacity hours
                  <input
                    aria-describedby={
                      validationErrors.weeklyCapacityHours
                        ? 'admin-weekly-capacity-hours-error'
                        : undefined
                    }
                    aria-invalid={Boolean(validationErrors.weeklyCapacityHours)}
                    className={inputClassName}
                    inputMode="numeric"
                    max="168"
                    min="1"
                    onChange={(event) => setValue('weeklyCapacityHours', event.target.value)}
                    step="1"
                    type="number"
                    value={values.weeklyCapacityHours}
                  />
                  {validationErrors.weeklyCapacityHours ? (
                    <span
                      className="text-sm font-medium text-danger-700"
                      id="admin-weekly-capacity-hours-error"
                    >
                      {validationErrors.weeklyCapacityHours}
                    </span>
                  ) : null}
                </label>
              </>
            ) : (
              <label className="grid gap-2 text-sm font-semibold text-ink-800">
                Department
                <input
                  aria-describedby={validationErrors.department ? 'admin-department-error' : undefined}
                  aria-invalid={Boolean(validationErrors.department)}
                  className={inputClassName}
                  onChange={(event) => setValue('department', event.target.value)}
                  placeholder="Engineering"
                  required
                  type="text"
                  value={values.department}
                />
                {validationErrors.department ? (
                  <span className="text-sm font-medium text-danger-700" id="admin-department-error">
                    {validationErrors.department}
                  </span>
                ) : null}
              </label>
            )}

            <label className="grid gap-2 text-sm font-semibold text-ink-800 lg:col-span-2">
              Bio
              <textarea
                aria-describedby={validationErrors.bio ? 'admin-bio-error' : undefined}
                aria-invalid={Boolean(validationErrors.bio)}
                className={textAreaClassName}
                maxLength={800}
                onChange={(event) => setValue('bio', event.target.value)}
                placeholder={
                  values.role === 'employee'
                    ? 'Optional employee bio'
                    : 'Optional supervisor bio'
                }
                value={values.bio}
              />
              <span className="text-xs font-medium text-ink-500">
                {values.bio.length}/800 characters
              </span>
              {validationErrors.bio ? (
                <span className="text-sm font-medium text-danger-700" id="admin-bio-error">
                  {validationErrors.bio}
                </span>
              ) : null}
            </label>
          </div>
        </Card>
      ) : null}

      {currentStepIndex === 2 && values.role === 'employee' ? (
        <ProvisioningSkillStep
          addApprovedSkill={addApprovedSkill}
          addCustomSkill={addCustomSkill}
          approvedSkillCatalog={approvedSkillCatalog}
          customSkillInput={customSkillInput}
          customSkillMessage={customSkillMessage}
          onCustomSkillInputChange={setCustomSkillInput}
          onRemoveSkill={removeSelectedSkill}
          onUpdateSkillProficiency={setProficiencyLevel}
          onUpdateSkillYears={setYearsOfExperience}
          selectedSkills={values.selectedSkills}
          validationErrors={validationErrors}
        />
      ) : null}

      {currentStepIndex === steps.length - 1 ? (
        <Card className="grid gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Final step
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">Review the account request</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Check the role-specific details before creating the user.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Card className="bg-surface-card-alt p-4">
              <h3 className="text-sm font-semibold text-ink-900">Account</h3>
              <dl className="mt-3 grid gap-2 text-sm text-ink-700">
                <div>
                  <dt className="font-medium text-ink-500">Email</dt>
                  <dd>{reviewData.account.email}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink-500">Role</dt>
                  <dd>{reviewData.account.roleLabel}</dd>
                </div>
              </dl>
            </Card>

            <Card className="bg-surface-card-alt p-4">
              <h3 className="text-sm font-semibold text-ink-900">Profile</h3>
              <dl className="mt-3 grid gap-2 text-sm text-ink-700">
                {reviewData.profile.map((item) => (
                  <div key={item.label}>
                    <dt className="font-medium text-ink-500">{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          {values.role === 'employee' ? (
            reviewData.skills.length === 0 ? (
              <EmptyState
                description="This employee will be created without initial skills."
                title="No skills selected"
              />
            ) : (
              <Card className="bg-surface-card-alt p-4">
                <h3 className="text-sm font-semibold text-ink-900">Skills</h3>
                <ul className="mt-3 grid gap-3 md:grid-cols-2">
                  {reviewData.skills.map((skill) => (
                    <li className="rounded-lg border border-border-subtle bg-surface-card p-3" key={skill.clientId}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink-900">{skill.name}</span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            skill.isCustom
                              ? 'bg-warning-100 text-warning-700'
                              : 'bg-success-100 text-success-700'
                          }`}
                        >
                          {skill.isCustom ? 'Pending approval' : 'Approved'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-600">
                        Proficiency {skill.proficiencyLevel}/5
                        {skill.yearsOfExperience
                          ? ` • ${skill.yearsOfExperience} years`
                          : ' • Experience not specified'}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          ) : null}

          <label className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-card-alt p-4 text-sm text-ink-700">
            <input
              aria-describedby={validationErrors.reviewConfirmed ? 'admin-review-confirmed-error' : undefined}
              aria-invalid={Boolean(validationErrors.reviewConfirmed)}
              checked={values.reviewConfirmed}
              className="mt-1 h-4 w-4 rounded border-border-subtle text-primary-600 focus:ring-primary-300"
              onChange={(event) => setReviewConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>I confirm this user information is ready to submit for account creation.</span>
          </label>
          {validationErrors.reviewConfirmed ? (
            <p className="text-sm font-medium text-danger-700" id="admin-review-confirmed-error">
              {validationErrors.reviewConfirmed}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-600">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            disabled={currentStepIndex === 0 || isSubmitting}
            onClick={goToPreviousStep}
            type="button"
            variant="secondary"
          >
            Back
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {currentStepIndex === steps.length - 1
              ? isSubmitting
                ? 'Creating user...'
                : 'Create user'
              : 'Continue'}
          </Button>
        </div>
      </div>
    </form>
  )
}

import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { EmptyState } from '../../../components/shared/EmptyState'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { AccountCreationStepIndicator } from '../../account-creation/components/AccountCreationStepIndicator'
import { ProvisioningSkillStep } from '../../account-creation/components/ProvisioningSkillStep'
import { useEmployeeSignupForm } from '../hooks/useEmployeeSignupForm'

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

const textAreaClassName = `${inputClassName} min-h-32 py-3`

export function SignupForm() {
  const form = useEmployeeSignupForm()
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
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <AccountCreationStepIndicator
        currentStepLabel={steps[currentStepIndex]?.label ?? 'Account'}
        steps={steps}
      />

      {submitError ? <ErrorState message={submitError} title="Signup failed" /> : null}

      {currentStepIndex === 0 ? (
        <Card className="grid gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Step 1
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">Create the account</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Start with the credentials you will use to sign in.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Email
              <input
                aria-describedby={validationErrors.email ? 'signup-email-error' : undefined}
                aria-invalid={Boolean(validationErrors.email)}
                autoComplete="email"
                className={inputClassName}
                onChange={(event) => setValue('email', event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={values.email}
              />
              {validationErrors.email ? (
                <span className="text-sm font-medium text-danger-700" id="signup-email-error">
                  {validationErrors.email}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Password
              <input
                aria-describedby={validationErrors.password ? 'signup-password-error' : undefined}
                aria-invalid={Boolean(validationErrors.password)}
                autoComplete="new-password"
                className={inputClassName}
                minLength={8}
                onChange={(event) => setValue('password', event.target.value)}
                placeholder="Create a password"
                required
                type="password"
                value={values.password}
              />
              {validationErrors.password ? (
                <span className="text-sm font-medium text-danger-700" id="signup-password-error">
                  {validationErrors.password}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800 lg:col-span-2">
              Confirm password
              <input
                aria-describedby={
                  validationErrors.confirmPassword ? 'signup-confirm-password-error' : undefined
                }
                aria-invalid={Boolean(validationErrors.confirmPassword)}
                autoComplete="new-password"
                className={inputClassName}
                minLength={8}
                onChange={(event) => setValue('confirmPassword', event.target.value)}
                placeholder="Repeat the password"
                required
                type="password"
                value={values.confirmPassword}
              />
              {validationErrors.confirmPassword ? (
                <span
                  className="text-sm font-medium text-danger-700"
                  id="signup-confirm-password-error"
                >
                  {validationErrors.confirmPassword}
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
            <h2 className="mt-2 text-xl font-bold text-ink-900">Add the profile details</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              These details become the starting employee profile after signup.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Full name
              <input
                aria-describedby={validationErrors.fullName ? 'signup-full-name-error' : undefined}
                aria-invalid={Boolean(validationErrors.fullName)}
                className={inputClassName}
                onChange={(event) => setValue('fullName', event.target.value)}
                placeholder="Employee name"
                required
                type="text"
                value={values.fullName}
              />
              {validationErrors.fullName ? (
                <span className="text-sm font-medium text-danger-700" id="signup-full-name-error">
                  {validationErrors.fullName}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Employment type
              <select
                aria-describedby={
                  validationErrors.employmentType ? 'signup-employment-type-error' : undefined
                }
                aria-invalid={Boolean(validationErrors.employmentType)}
                className={inputClassName}
                onChange={(event) =>
                  setValue('employmentType', event.target.value as 'full_time' | 'part_time' | '')
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
                  id="signup-employment-type-error"
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
                    ? 'signup-weekly-capacity-hours-error'
                    : undefined
                }
                aria-invalid={Boolean(validationErrors.weeklyCapacityHours)}
                className={inputClassName}
                inputMode="numeric"
                max="168"
                min="1"
                onChange={(event) => setValue('weeklyCapacityHours', event.target.value)}
                required
                step="1"
                type="number"
                value={values.weeklyCapacityHours}
              />
              {validationErrors.weeklyCapacityHours ? (
                <span
                  className="text-sm font-medium text-danger-700"
                  id="signup-weekly-capacity-hours-error"
                >
                  {validationErrors.weeklyCapacityHours}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800 lg:col-span-2">
              Bio
              <textarea
                aria-describedby={validationErrors.bio ? 'signup-bio-error' : undefined}
                aria-invalid={Boolean(validationErrors.bio)}
                className={textAreaClassName}
                maxLength={800}
                onChange={(event) => setValue('bio', event.target.value)}
                placeholder="Share focus areas, strengths, or the kind of work you do best."
                value={values.bio}
              />
              <span className="text-xs font-medium text-ink-500">
                {values.bio.length}/800 characters
              </span>
              {validationErrors.bio ? (
                <span className="text-sm font-medium text-danger-700" id="signup-bio-error">
                  {validationErrors.bio}
                </span>
              ) : null}
            </label>
          </div>
        </Card>
      ) : null}

      {currentStepIndex === 2 ? (
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

      {currentStepIndex === 3 ? (
        <Card className="grid gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
              Step 4
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">Review before submission</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Confirm the account details before the profile is provisioned.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="bg-surface-card-alt p-4">
              <h3 className="text-sm font-semibold text-ink-900">Account</h3>
              <dl className="mt-3 grid gap-2 text-sm text-ink-700">
                <div>
                  <dt className="font-medium text-ink-500">Email</dt>
                  <dd>{reviewData.account.email}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink-500">Password</dt>
                  <dd>{reviewData.account.passwordLabel}</dd>
                </div>
              </dl>
            </Card>

            <Card className="bg-surface-card-alt p-4">
              <h3 className="text-sm font-semibold text-ink-900">Profile</h3>
              <dl className="mt-3 grid gap-2 text-sm text-ink-700">
                <div>
                  <dt className="font-medium text-ink-500">Full name</dt>
                  <dd>{reviewData.profile.fullName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink-500">Employment type</dt>
                  <dd>{reviewData.profile.employmentTypeLabel}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink-500">Weekly capacity</dt>
                  <dd>{reviewData.profile.weeklyCapacityHours}</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink-500">Bio</dt>
                  <dd>{reviewData.profile.bio}</dd>
                </div>
              </dl>
            </Card>

            <Card className="bg-surface-card-alt p-4">
              <h3 className="text-sm font-semibold text-ink-900">Skills</h3>
              {reviewData.skills.length === 0 ? (
                <EmptyState
                  description="No skills will be sent with this signup submission."
                  title="No skills selected"
                />
              ) : (
                <ul className="mt-3 grid gap-3">
                  {reviewData.skills.map((skill) => (
                    <li className="rounded-lg border border-border-subtle bg-surface-card p-3" key={skill.clientId}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink-900">{skill.name}</span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            skill.isCustom
                              ? 'bg-warning-bg text-text-primary'
                              : 'bg-success-bg text-success-fg'
                          }`}
                        >
                          {skill.isCustom ? 'Pending approval' : 'Approved'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-600">
                        Proficiency {skill.proficiencyLevel}/5
                        {skill.yearsOfExperience
                          ? ` • ${skill.yearsOfExperience} years of experience`
                          : ' • Experience not specified'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-card-alt p-4 text-sm text-ink-700">
            <input
              aria-describedby={
                validationErrors.reviewConfirmed ? 'signup-review-confirmed-error' : undefined
              }
              aria-invalid={Boolean(validationErrors.reviewConfirmed)}
              checked={values.reviewConfirmed}
              className="mt-1 h-4 w-4 rounded border-border-subtle text-primary-600 focus:ring-primary-300"
              onChange={(event) => setReviewConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              I confirm that this information is accurate and should be submitted to create my
              employee account.
            </span>
          </label>
          {validationErrors.reviewConfirmed ? (
            <p className="text-sm font-medium text-danger-700" id="signup-review-confirmed-error">
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
                ? 'Creating account...'
                : 'Create account'
              : 'Continue'}
          </Button>
        </div>
      </div>
    </form>
  )
}

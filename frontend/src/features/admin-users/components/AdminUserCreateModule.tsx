import type { FormEvent, ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Segmented } from '../../../components/ui/Segmented'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import {
  fieldErrorClass,
  fieldHintClass,
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
} from '../../../components/ui/fieldStyles'
import { AccountCreationStepIndicator } from '../../account-creation/components/AccountCreationStepIndicator'
import { ProvisioningSkillStep } from '../../account-creation/components/ProvisioningSkillStep'
import { useAdminUserCreationForm } from '../hooks/useAdminUserCreationForm'

const ROLE_OPTIONS = [
  { id: 'employee', label: 'Employee' },
  { id: 'supervisor', label: 'Supervisor' },
] as const

const ROLE_HINTS = {
  employee: 'Gets tasks, a skills profile and workload tracking.',
  supervisor: 'Manages projects and assigns work to employees.',
} as const

function Field({ children, error, errorId, hint, label, wide = false }: {
  children: ReactNode
  error?: string
  errorId: string
  hint?: string
  label: string
  wide?: boolean
}) {
  return (
    <label className={`${fieldLabelClass}${wide ? ' [grid-column:1/-1]' : ''}`}>
      {label}
      {children}
      {hint ? <span className={fieldHintClass}>{hint}</span> : null}
      {error ? <span className={fieldErrorClass} id={errorId}>{error}</span> : null}
    </label>
  )
}

function ReviewList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="m-0 flex flex-col">
      {items.map((item) => (
        <div className="flex justify-between gap-4 border-t border-chart-grid py-2.5 first:border-t-0 first:pt-0" key={item.label}>
          <dt className="body text-text-secondary">{item.label}</dt>
          <dd className="body-strong m-0 text-right text-text-primary [overflow-wrap:anywhere]">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function AdminUserCreateModule() {
  const form = useAdminUserCreationForm()
  const {
    addApprovedSkill,
    addCustomSkill,
    approvedSkillCatalog,
    currentStepIndex,
    customSkillInput,
    customSkillMessage,
    customSkillTone,
    goToNextStep,
    goToPreviousStep,
    isCheckingCustomSkill,
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
  const isLastStep = currentStepIndex === steps.length - 1

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isLastStep) {
      await submit()
      return
    }

    goToNextStep()
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <PageHeader
        back={{ label: 'Platform', to: '/platform-admin' }}
        subtitle="Create an employee or supervisor account. They get an email to set their password."
        title="New user"
      />

      <AccountCreationStepIndicator currentStepLabel={steps[currentStepIndex]?.label ?? 'Account'} steps={steps} />

      {submitError ? (
        <StateBlock kind="error" title="The user could not be created">{submitError}</StateBlock>
      ) : null}

      {currentStepIndex === 0 ? (
        <Card aria-labelledby="account-step-title" className="flex flex-col gap-5">
          <CardHeader helper="Admin provisioning supports employees and supervisors." id="account-step-title" title="Account" />
          <div className="flex flex-col gap-1.5">
            <Segmented
              label="User role"
              onChange={(role) => setValue('role', role)}
              options={ROLE_OPTIONS}
              value={values.role}
            />
            <p className={`${fieldHintClass} m-0`}>{ROLE_HINTS[values.role]}</p>
            {validationErrors.role ? <p className={`${fieldErrorClass} m-0`} id="admin-role-error">{validationErrors.role}</p> : null}
          </div>
          <div className="max-w-xl">
            <Field error={validationErrors.email} errorId="admin-email-error" label="Email">
              <input
                aria-describedby={validationErrors.email ? 'admin-email-error' : undefined}
                aria-invalid={Boolean(validationErrors.email)}
                autoComplete="off"
                className={fieldInputClass}
                onChange={(event) => setValue('email', event.target.value)}
                placeholder="new.user@example.com"
                required
                type="email"
                value={values.email}
              />
            </Field>
          </div>
        </Card>
      ) : null}

      {currentStepIndex === 1 ? (
        <Card aria-labelledby="profile-step-title" className="flex flex-col gap-5">
          <CardHeader
            helper="Workload, availability and performance are calculated by the system later."
            id="profile-step-title"
            title="Profile"
          />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
            <Field error={validationErrors.fullName} errorId="admin-full-name-error" label="Full name">
              <input
                aria-describedby={validationErrors.fullName ? 'admin-full-name-error' : undefined}
                aria-invalid={Boolean(validationErrors.fullName)}
                className={fieldInputClass}
                onChange={(event) => setValue('fullName', event.target.value)}
                placeholder="First and last name"
                required
                type="text"
                value={values.fullName}
              />
            </Field>

            {values.role === 'employee' ? (
              <>
                <Field error={validationErrors.employmentType} errorId="admin-employment-type-error" label="Employment type">
                  <select
                    aria-describedby={validationErrors.employmentType ? 'admin-employment-type-error' : undefined}
                    aria-invalid={Boolean(validationErrors.employmentType)}
                    className={fieldInputClass}
                    onChange={(event) => setValue('employmentType', event.target.value as 'full_time' | 'part_time' | '')}
                    value={values.employmentType}
                  >
                    <option value="">Select employment type</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                  </select>
                </Field>
                <Field
                  error={validationErrors.weeklyCapacityHours}
                  errorId="admin-weekly-capacity-hours-error"
                  hint="Used to calculate workload. 1–168."
                  label="Weekly capacity (hours)"
                >
                  <input
                    aria-describedby={validationErrors.weeklyCapacityHours ? 'admin-weekly-capacity-hours-error' : undefined}
                    aria-invalid={Boolean(validationErrors.weeklyCapacityHours)}
                    className={fieldInputClass}
                    inputMode="numeric"
                    max="168"
                    min="1"
                    onChange={(event) => setValue('weeklyCapacityHours', event.target.value)}
                    step="1"
                    type="number"
                    value={values.weeklyCapacityHours}
                  />
                </Field>
              </>
            ) : (
              <Field error={validationErrors.department} errorId="admin-department-error" label="Department">
                <input
                  aria-describedby={validationErrors.department ? 'admin-department-error' : undefined}
                  aria-invalid={Boolean(validationErrors.department)}
                  className={fieldInputClass}
                  onChange={(event) => setValue('department', event.target.value)}
                  placeholder="Engineering"
                  required
                  type="text"
                  value={values.department}
                />
              </Field>
            )}

            <Field error={validationErrors.bio} errorId="admin-bio-error" hint={`${values.bio.length}/800 characters · optional`} label="Bio" wide>
              <textarea
                aria-describedby={validationErrors.bio ? 'admin-bio-error' : undefined}
                aria-invalid={Boolean(validationErrors.bio)}
                className={fieldTextareaClass}
                maxLength={800}
                onChange={(event) => setValue('bio', event.target.value)}
                placeholder="What they work on and what they are good at"
                value={values.bio}
              />
            </Field>
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
          customSkillTone={customSkillTone}
          isCheckingCustomSkill={isCheckingCustomSkill}
          onCustomSkillInputChange={setCustomSkillInput}
          onRemoveSkill={removeSelectedSkill}
          onUpdateSkillProficiency={setProficiencyLevel}
          onUpdateSkillYears={setYearsOfExperience}
          selectedSkills={values.selectedSkills}
          validationErrors={validationErrors}
        />
      ) : null}

      {isLastStep ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            <Card aria-labelledby="review-account-title" className="flex flex-col gap-3">
              <CardHeader id="review-account-title" level={3} title="Account" />
              <ReviewList
                items={[
                  { label: 'Email', value: reviewData.account.email },
                  { label: 'Role', value: reviewData.account.roleLabel },
                ]}
              />
            </Card>
            <Card aria-labelledby="review-profile-title" className="flex flex-col gap-3">
              <CardHeader id="review-profile-title" level={3} title="Profile" />
              <ReviewList items={reviewData.profile} />
            </Card>
          </div>

          {values.role === 'employee' ? (
            <Card aria-labelledby="review-skills-title" className="flex flex-col gap-3">
              <CardHeader id="review-skills-title" level={3} title={`Skills · ${reviewData.skills.length}`} />
              {reviewData.skills.length === 0 ? (
                <StateBlock compact title="No skills selected">This employee will be created without initial skills.</StateBlock>
              ) : (
                <ul className="m-0 grid list-none gap-x-6 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
                  {reviewData.skills.map((skill) => (
                    <li className="flex items-center justify-between gap-3 border-t border-chart-grid py-2.5" key={skill.clientId}>
                      <div className="min-w-0">
                        <p className="body-strong m-0 truncate text-text-primary">{skill.name}</p>
                        <p className="helper m-0 text-text-tertiary">
                          {skill.proficiencyLevel}/5{skill.yearsOfExperience ? ` · ${skill.yearsOfExperience} years` : ''}
                        </p>
                      </div>
                      <StatusBadge label={skill.isCustom ? 'Pending approval' : 'Approved'} status={skill.isCustom ? 'pending' : 'approved'} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label className="body flex items-start gap-3 text-text-primary">
              <input
                aria-describedby={validationErrors.reviewConfirmed ? 'admin-review-confirmed-error' : undefined}
                aria-invalid={Boolean(validationErrors.reviewConfirmed)}
                checked={values.reviewConfirmed}
                className="mt-0.5 size-4 accent-primary-600"
                onChange={(event) => setReviewConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>I confirm these details are ready and the account can be created.</span>
            </label>
            {validationErrors.reviewConfirmed ? (
              <p className={`${fieldErrorClass} m-0`} id="admin-review-confirmed-error">{validationErrors.reviewConfirmed}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4">
        <p className="helper m-0 text-text-secondary">Step {currentStepIndex + 1} of {steps.length}</p>
        <div className="flex gap-3">
          {currentStepIndex > 0 ? (
            <Button disabled={isSubmitting} onClick={goToPreviousStep} type="button" variant="secondary">Back</Button>
          ) : null}
          <Button disabled={isSubmitting} type="submit">
            {isLastStep ? (isSubmitting ? 'Creating user…' : 'Create user') : 'Continue'}
          </Button>
        </div>
      </div>
    </form>
  )
}

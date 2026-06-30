import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { EmptyState } from '../../../components/shared/EmptyState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmployeeSkillList } from './EmployeeSkillList'
import type { useEmployeeProfileEditor } from '../hooks/useEmployeeProfileEditor'

interface EmployeeProfileFormProps {
  approvedSkillCount: number
  editor: ReturnType<typeof useEmployeeProfileEditor>
}

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-200'

const textAreaClassName = `${inputClassName} min-h-32 py-3`

export function EmployeeProfileForm({
  approvedSkillCount,
  editor,
}: EmployeeProfileFormProps) {
  const {
    addSkill,
    availableSkillSuggestions,
    categorizedSkills,
    draft,
    isDirty,
    isSaving,
    removeSkill,
    resetForm,
    saveProfile,
    setBio,
    setFullName,
    setSkillInput,
    skillInput,
    submitError,
    validationErrors,
  } = editor

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveProfile()
  }

  if (!draft) {
    return null
  }

  const hasNoSkills =
    categorizedSkills.approved.length === 0 && categorizedSkills.pending.length === 0

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-brand-700">
              Editable details
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink-900">Update your profile</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
              You can edit your name, biography, and skill list here. New skill
              entries that are not in the approved catalog will be submitted as
              pending for organizational review.
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">{approvedSkillCount} approved skills available</p>
            <p className="mt-1 text-ink-600">Start typing to reuse an approved skill when possible.</p>
          </div>
        </div>

        {submitError ? (
          <ErrorState message={submitError} title="Unable to save profile" />
        ) : null}

        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Full name
              <input
                className={inputClassName}
                maxLength={120}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                required
                type="text"
                value={draft.fullName}
              />
              {validationErrors.fullName ? (
                <span className="text-sm font-medium text-danger-700">
                  {validationErrors.fullName}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Bio
              <textarea
                className={textAreaClassName}
                maxLength={800}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Tell your team about your strengths, focus areas, or current expertise."
                value={draft.bio}
              />
              <span className="text-xs font-medium text-ink-500">
                {draft.bio.length}/800 characters
              </span>
              {validationErrors.bio ? (
                <span className="text-sm font-medium text-danger-700">
                  {validationErrors.bio}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4">
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="grid flex-1 gap-2 text-sm font-semibold text-ink-800">
                  Add skill
                  <input
                    className={inputClassName}
                    list="employee-approved-skills"
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addSkill()
                      }
                    }}
                    placeholder="React, SQL, stakeholder communication..."
                    type="text"
                    value={skillInput}
                  />
                </label>
                <Button className="sm:min-w-28" onClick={addSkill} type="button">
                  Add skill
                </Button>
              </div>
              <datalist id="employee-approved-skills">
                {availableSkillSuggestions.map((skill) => (
                  <option key={skill} value={skill} />
                ))}
              </datalist>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Approved skills are applied immediately. New skill names are
                saved as pending until your organization reviews them.
              </p>
              {validationErrors.skillInput ? (
                <p className="mt-2 text-sm font-medium text-danger-700">
                  {validationErrors.skillInput}
                </p>
              ) : null}
            </div>

            {hasNoSkills ? (
              <EmptyState
                description="Add the skills you actively use so future assignments and recommendations reflect your profile accurately."
                title="No skills added yet"
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <EmployeeSkillList
                  emptyMessage="No approved skills are currently attached to your profile."
                  items={categorizedSkills.approved.map((skill) => skill.name)}
                  onRemove={removeSkill}
                  title="Approved skills"
                  tone="approved"
                />
                <EmployeeSkillList
                  emptyMessage="Skills that still need approval will appear here."
                  items={categorizedSkills.pending.map((skill) => skill.name)}
                  onRemove={removeSkill}
                  title="Pending skills"
                  tone="pending"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink-600">
              {isDirty ? 'You have unsaved changes.' : 'All changes are saved.'}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={!isDirty || isSaving} onClick={resetForm} type="button" variant="secondary">
                Reset
              </Button>
              <Button disabled={isSaving} type="submit">
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Card>
  )
}

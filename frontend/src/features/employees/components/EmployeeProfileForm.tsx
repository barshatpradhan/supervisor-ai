import type { FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { fieldErrorClass, fieldHintClass, fieldInputClass, fieldLabelClass, fieldTextareaClass } from '../../../components/ui/fieldStyles'
import { StateBlock } from '../../../components/ui/StateBlock'
import { EmployeeSkillList } from './EmployeeSkillList'
import type { useEmployeeProfileEditor } from '../hooks/useEmployeeProfileEditor'

interface EmployeeProfileFormProps {
  approvedSkillCount: number
  editor: ReturnType<typeof useEmployeeProfileEditor>
}

export function EmployeeProfileForm({ approvedSkillCount, editor }: EmployeeProfileFormProps) {
  const {
    addSkill,
    availableSkillSuggestions,
    categorizedSkills,
    draft,
    isCheckingSkill,
    isDirty,
    isSaving,
    removeSkill,
    resetForm,
    saveProfile,
    setBio,
    setDepartment,
    setFullName,
    setJobTitle,
    setSkillInput,
    skillInput,
    skillNotice,
    submitError,
    updateSkill,
    validationErrors,
  } = editor

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveProfile()
  }

  if (!draft) {
    return null
  }

  const hasNoSkills = categorizedSkills.approved.length === 0 && categorizedSkills.pending.length === 0

  return (
    <Card aria-labelledby="edit-profile-title" className="flex flex-col gap-5">
      <CardHeader helper="Your name, bio and skills. Your organization manages everything else." id="edit-profile-title" title="Edit profile" />

      {submitError ? <StateBlock compact kind="error" title="Your profile could not be saved">{submitError}</StateBlock> : null}

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={fieldLabelClass}>
            Full name
            <input className={fieldInputClass} maxLength={120} onChange={(event) => setFullName(event.target.value)} required type="text" value={draft.fullName} />
            {validationErrors.fullName ? <span className={fieldErrorClass}>{validationErrors.fullName}</span> : null}
          </label>
          <label className={fieldLabelClass}>
            Job title
            <input className={fieldInputClass} maxLength={120} onChange={(event) => setJobTitle(event.target.value)} placeholder="Senior frontend engineer" type="text" value={draft.jobTitle} />
          </label>
          <label className={fieldLabelClass}>
            Department
            <input className={fieldInputClass} maxLength={120} onChange={(event) => setDepartment(event.target.value)} placeholder="Product engineering" type="text" value={draft.department} />
          </label>
          <label className={`${fieldLabelClass} md:col-span-2`}>
            Bio
            <textarea
              className={fieldTextareaClass}
              maxLength={800}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Your strengths, focus areas or the work you do best."
              value={draft.bio}
            />
            <span className={fieldHintClass}>{draft.bio.length}/800 characters</span>
            {validationErrors.bio ? <span className={fieldErrorClass}>{validationErrors.bio}</span> : null}
          </label>
        </div>

        <section aria-labelledby="profile-skills-title" className="flex flex-col gap-4 border-t border-chart-grid pt-5">
          <div>
            <h3 className="section-title m-0 text-text-primary" id="profile-skills-title">Skills</h3>
            <p className="helper m-0 text-text-tertiary">
              {approvedSkillCount} approved skills to choose from. Anything else is checked and corrected, and genuinely new skills go to a platform admin.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className={`${fieldLabelClass} flex-1`}>
              Add skill
              <input
                className={fieldInputClass}
                list="employee-approved-skills"
                onChange={(event) => setSkillInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void addSkill()
                  }
                }}
                placeholder="React, SQL, stakeholder communication…"
                type="text"
                value={skillInput}
              />
            </label>
            <Button className="sm:min-w-28" disabled={isCheckingSkill} onClick={() => { void addSkill() }} variant="secondary">
              {isCheckingSkill ? 'Checking…' : 'Add skill'}
            </Button>
          </div>
          <datalist id="employee-approved-skills">
            {availableSkillSuggestions.map((skill) => <option key={skill} value={skill} />)}
          </datalist>
          {validationErrors.skillInput ? <p className={`${fieldErrorClass} m-0`}>{validationErrors.skillInput}</p> : null}
          {skillNotice && !validationErrors.skillInput ? (
            <p aria-live="polite" className={`helper m-0 ${skillNotice.tone === 'warning' ? 'font-medium text-warning-fg' : 'text-text-secondary'}`}>
              {skillNotice.message}
            </p>
          ) : null}

          {hasNoSkills ? (
            <StateBlock compact title="No skills yet">Add the skills you use so assignments and recommendations fit your profile.</StateBlock>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <EmployeeSkillList emptyMessage="No approved skills yet." items={categorizedSkills.approved.map((skill) => skill.name)} onRemove={removeSkill} title="Approved" tone="approved" />
                <EmployeeSkillList emptyMessage="Nothing waiting for review." items={categorizedSkills.pending.map((skill) => skill.name)} onRemove={removeSkill} title="Waiting for review" tone="pending" />
              </div>
              <div className="overflow-x-auto rounded-control border border-chart-grid">
                <table className="body w-full min-w-[480px] border-collapse text-left">
                  <caption className="sr-only">Skill experience</caption>
                  <thead className="bg-surface-muted">
                    <tr>
                      <th className="label px-4 py-2.5 text-text-secondary" scope="col">Skill</th>
                      <th className="label w-40 px-3 py-2.5 text-text-secondary" scope="col">Proficiency</th>
                      <th className="label w-40 px-4 py-2.5 text-text-secondary" scope="col">Years</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.skills.map((skill) => (
                      <tr className="border-t border-chart-grid" key={skill.name}>
                        <th className="body-strong px-4 py-2 text-text-primary" scope="row">{skill.name}</th>
                        <td className="px-3 py-2">
                          <select
                            aria-label={`${skill.name} proficiency`}
                            className={`${fieldInputClass} w-full`}
                            onChange={(event) => updateSkill(skill.name, { proficiencyLevel: Number(event.target.value) })}
                            value={skill.proficiencyLevel}
                          >
                            {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} of 5</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            aria-label={`${skill.name} years of experience`}
                            className={`${fieldInputClass} w-full`}
                            max={80}
                            min={0}
                            onChange={(event) => updateSkill(skill.name, { yearsOfExperience: event.target.value })}
                            placeholder="Optional"
                            step="0.5"
                            type="number"
                            value={skill.yearsOfExperience}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <div className="flex flex-col gap-3 border-t border-chart-grid pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span aria-live="polite" className="helper text-text-tertiary">{isDirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button disabled={!isDirty || isSaving} onClick={resetForm} variant="secondary">Discard changes</Button>
            <Button disabled={isSaving || !isDirty} type="submit">{isSaving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
      </form>
    </Card>
  )
}

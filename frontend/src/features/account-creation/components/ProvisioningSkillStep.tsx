import { Plus, X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { fieldErrorClass, fieldHintClass, fieldInputClass, fieldLabelClass } from '../../../components/ui/fieldStyles'
import type { ApprovedSkillCatalogState, SkillSelectionItem } from '../types/accountCreation'

interface ProvisioningSkillStepProps {
  addApprovedSkill: (skillId: string) => void
  addCustomSkill: () => void
  approvedSkillCatalog: ApprovedSkillCatalogState
  customSkillInput: string
  customSkillMessage: string
  customSkillTone?: 'info' | 'warning' | 'error'
  isCheckingCustomSkill?: boolean
  onCustomSkillInputChange: (value: string) => void
  onRemoveSkill: (clientId: string) => void
  onUpdateSkillProficiency: (clientId: string, value: number) => void
  onUpdateSkillYears: (clientId: string, value: string) => void
  selectedSkills: SkillSelectionItem[]
  validationErrors: Partial<Record<'skills' | `skill-${string}`, string>>
}

export function ProvisioningSkillStep({
  addApprovedSkill,
  addCustomSkill,
  approvedSkillCatalog,
  customSkillInput,
  customSkillMessage,
  customSkillTone = 'info',
  isCheckingCustomSkill = false,
  onCustomSkillInputChange,
  onRemoveSkill,
  onUpdateSkillProficiency,
  onUpdateSkillYears,
  selectedSkills,
  validationErrors,
}: ProvisioningSkillStepProps) {
  const {
    categories,
    error,
    filteredSkills,
    isLoading,
    retry,
    searchValue,
    selectedCategory,
    setSearchValue,
    setSelectedCategory,
  } = approvedSkillCatalog

  return (
    <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
      <Card aria-labelledby="skill-catalog-title" className="flex flex-col gap-4">
        <CardHeader
          helper="Pick from the approved catalog first. Custom skills wait for platform approval."
          id="skill-catalog-title"
          title="Skill catalog"
        />

        {isLoading ? <StateBlock compact kind="loading" title="Loading approved skills" /> : null}

        {error ? (
          <StateBlock
            action={<Button onClick={() => { void retry() }} type="button" variant="secondary">Retry</Button>}
            compact
            kind="error"
            title="Approved skills could not be loaded"
          >
            {error}
          </StateBlock>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="grid gap-3 [grid-template-columns:minmax(0,1fr)_minmax(0,180px)]">
              <label className={fieldLabelClass}>
                Search
                <input
                  className={fieldInputClass}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="React, SQL, QA…"
                  type="search"
                  value={searchValue}
                />
              </label>
              <label className={fieldLabelClass}>
                Category
                <select className={fieldInputClass} onChange={(event) => setSelectedCategory(event.target.value)} value={selectedCategory}>
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>

            {filteredSkills.length === 0 ? (
              <StateBlock compact title="No approved skills match">
                Try a different search or category, or add a custom skill below.
              </StateBlock>
            ) : (
              <ul aria-label="Approved skills available for selection" className="m-0 flex list-none flex-wrap gap-2 p-0">
                {filteredSkills.map((skill) => (
                  <li key={skill.id}>
                    <button
                      className="body inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-strong bg-surface-card px-3 text-text-primary transition hover:border-primary-600 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      onClick={() => addApprovedSkill(skill.id)}
                      title={skill.category ?? 'Uncategorized'}
                      type="button"
                    >
                      <Plus aria-hidden="true" className="text-text-tertiary" size={14} />
                      {skill.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 border-t border-chart-grid pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className={`${fieldLabelClass} min-w-0 flex-1`}>
                  Custom skill
                  <input
                    className={fieldInputClass}
                    onChange={(event) => onCustomSkillInputChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addCustomSkill()
                      }
                    }}
                    placeholder="Only if the catalog has nothing suitable"
                    type="text"
                    value={customSkillInput}
                  />
                </label>
                <Button disabled={isCheckingCustomSkill} onClick={addCustomSkill} type="button" variant="secondary">
                  {isCheckingCustomSkill ? 'Checking…' : 'Add custom skill'}
                </Button>
              </div>
              {customSkillMessage ? (
                <p aria-live="polite" className={`${customSkillTone === 'warning' ? 'helper font-medium text-warning-fg' : fieldHintClass} m-0`}>
                  {customSkillMessage}
                </p>
              ) : null}
              {validationErrors.skills ? <p className={`${fieldErrorClass} m-0`}>{validationErrors.skills}</p> : null}
            </div>
          </>
        ) : null}
      </Card>

      <Card aria-labelledby="selected-skills-title" className="flex flex-col gap-4">
        <CardHeader
          helper="Set a proficiency for each skill; years of experience are optional."
          id="selected-skills-title"
          title={`Selected skills${selectedSkills.length > 0 ? ` · ${selectedSkills.length}` : ''}`}
        />

        {selectedSkills.length === 0 ? (
          <StateBlock compact title="No skills selected yet">
            Choose from the catalog or add a custom skill.
          </StateBlock>
        ) : (
          <ul aria-label="Selected skills" className="m-0 flex list-none flex-col p-0">
            {selectedSkills.map((skill) => {
              const fieldError = validationErrors[`skill-${skill.clientId}`]

              return (
                <li className="flex flex-col gap-3 border-t border-chart-grid py-3 first:border-t-0 first:pt-0" key={skill.clientId}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="body-strong m-0 text-text-primary">{skill.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={skill.isCustom ? 'pending' : 'approved'} label={skill.isCustom ? 'Pending approval' : 'Approved'} />
                        <span className="helper text-text-tertiary">
                          {skill.category ?? (skill.isCustom ? 'Custom skill' : 'Uncategorized')}
                        </span>
                      </div>
                    </div>
                    <Button aria-label={`Remove ${skill.name}`} onClick={() => onRemoveSkill(skill.clientId)} type="button" variant="ghost">
                      <X aria-hidden="true" size={16} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className={fieldLabelClass}>
                      Proficiency
                      <select
                        className={fieldInputClass}
                        onChange={(event) => onUpdateSkillProficiency(skill.clientId, Number(event.target.value))}
                        value={skill.proficiencyLevel}
                      >
                        {[1, 2, 3, 4, 5].map((level) => (
                          <option key={level} value={level}>{level} / 5</option>
                        ))}
                      </select>
                    </label>
                    <label className={fieldLabelClass}>
                      Years of experience
                      <input
                        className={fieldInputClass}
                        inputMode="decimal"
                        min="0"
                        onChange={(event) => onUpdateSkillYears(skill.clientId, event.target.value)}
                        placeholder="Optional"
                        step="0.5"
                        type="number"
                        value={skill.yearsOfExperience}
                      />
                    </label>
                  </div>

                  {fieldError ? <p className={`${fieldErrorClass} m-0`}>{fieldError}</p> : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

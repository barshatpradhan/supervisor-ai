import { ErrorState } from '../../../components/shared/ErrorState'
import { EmptyState } from '../../../components/shared/EmptyState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { ApprovedSkillCatalogState, SkillSelectionItem } from '../types/accountCreation'

interface ProvisioningSkillStepProps {
  addApprovedSkill: (skillId: string) => void
  addCustomSkill: () => void
  approvedSkillCatalog: ApprovedSkillCatalogState
  customSkillInput: string
  customSkillMessage: string
  onCustomSkillInputChange: (value: string) => void
  onRemoveSkill: (clientId: string) => void
  onUpdateSkillProficiency: (clientId: string, value: number) => void
  onUpdateSkillYears: (clientId: string, value: string) => void
  selectedSkills: SkillSelectionItem[]
  validationErrors: Partial<Record<'skills' | `skill-${string}`, string>>
}

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

export function ProvisioningSkillStep({
  addApprovedSkill,
  addCustomSkill,
  approvedSkillCatalog,
  customSkillInput,
  customSkillMessage,
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            Approved skills
          </p>
          <h2 className="mt-2 text-xl font-bold text-ink-900">Build the skill list</h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            Search the approved catalog first, then add a custom skill only when
            nothing suitable exists. Custom entries remain pending approval after
            account creation.
          </p>
        </div>

        {isLoading ? <LoadingState label="Loading approved skills" /> : null}

        {error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              void retry()
            }}
            title="Unable to load approved skills"
          />
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="grid gap-2 text-sm font-semibold text-ink-800">
                Search approved skills
                <input
                  className={inputClassName}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search React, SQL, QA..."
                  type="search"
                  value={searchValue}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink-800">
                Filter by category
                <select
                  className={inputClassName}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  value={selectedCategory}
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-border-subtle bg-surface-card-alt p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="grid flex-1 gap-2 text-sm font-semibold text-ink-800">
                  Add a custom skill
                  <input
                    className={inputClassName}
                    onChange={(event) => onCustomSkillInputChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addCustomSkill()
                      }
                    }}
                    placeholder="Only add a custom skill if the catalog does not fit"
                    type="text"
                    value={customSkillInput}
                  />
                </label>
                <Button className="sm:min-w-40" onClick={addCustomSkill} type="button" variant="secondary">
                  Add custom skill
                </Button>
              </div>
              <p className="mt-2 text-sm text-ink-600">{customSkillMessage}</p>
              {validationErrors.skills ? (
                <p className="mt-2 text-sm font-medium text-danger-700">
                  {validationErrors.skills}
                </p>
              ) : null}
            </div>

            {filteredSkills.length === 0 ? (
              <EmptyState
                description="Try a different search or category, or add a custom skill if the catalog does not have the right match."
                title="No approved skills match this filter"
              />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2" aria-label="Approved skills available for selection">
                {filteredSkills.map((skill) => (
                  <li key={skill.id}>
                    <button
                      className="flex h-full w-full flex-col items-start rounded-xl border border-border-subtle bg-surface-card p-4 text-left transition hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
                      onClick={() => addApprovedSkill(skill.id)}
                      type="button"
                    >
                      <span className="text-sm font-semibold text-ink-900">{skill.name}</span>
                      <span className="mt-1 text-xs text-ink-600">
                        {skill.category ?? 'Uncategorized'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            Selected skills
          </p>
          <h2 className="mt-2 text-xl font-bold text-ink-900">Add proficiency details</h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            Each skill needs a proficiency level and optional years of experience.
          </p>
        </div>

        {selectedSkills.length === 0 ? (
          <EmptyState
            description="Choose approved skills or add a custom skill to capture what this person can do."
            title="No skills selected yet"
          />
        ) : (
          <ul className="grid gap-4" aria-label="Selected skills">
            {selectedSkills.map((skill) => {
              const fieldError = validationErrors[`skill-${skill.clientId}`]

              return (
                <li
                  className="rounded-xl border border-border-subtle bg-surface-card-alt p-4"
                  key={skill.clientId}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900">{skill.name}</p>
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
                        <p className="mt-1 text-xs text-ink-600">
                          {skill.category ?? (skill.isCustom ? 'Custom skill' : 'Uncategorized')}
                        </p>
                      </div>
                      <Button onClick={() => onRemoveSkill(skill.clientId)} type="button" variant="ghost">
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-semibold text-ink-800">
                        Proficiency level
                        <select
                          className={inputClassName}
                          onChange={(event) =>
                            onUpdateSkillProficiency(skill.clientId, Number(event.target.value))
                          }
                          value={skill.proficiencyLevel}
                        >
                          {[1, 2, 3, 4, 5].map((level) => (
                            <option key={level} value={level}>
                              {level} / 5
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-semibold text-ink-800">
                        Years of experience
                        <input
                          className={inputClassName}
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

                    {fieldError ? (
                      <p className="text-sm font-medium text-danger-700">{fieldError}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

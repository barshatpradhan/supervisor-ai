import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { StateBlock } from '../../../components/ui/StateBlock'
import { fieldInputClass } from '../../../components/ui/fieldStyles'
import { useApiResource } from '../../../hooks/useApiResource'
import { parseApiError } from '../../../lib/api'
import { approveSkill, listPendingSkills, rejectSkill } from '../../../services/admin/adminSkillService'
import { listSkillCategories } from '../../../services/skills/skillService'
import type { BackendPendingSkill } from '../../../types/backend'

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

interface Draft {
  category: string
  name: string
}

/**
 * Skills that are not in the catalog yet. Most typed skills never reach this list: they are
 * matched or corrected on entry. The admin can still fix the name and category before approving;
 * approving a name that already exists merges the two.
 */
export function PendingSkillsQueue({ onChange }: { onChange?: () => void }) {
  const pendingSkillsQuery = useApiResource(listPendingSkills)
  const categoriesQuery = useApiResource(listSkillCategories)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const categories = categoriesQuery.data ?? []

  function draftFor(skill: BackendPendingSkill): Draft {
    return drafts[skill.id] ?? { category: skill.category ?? '', name: skill.name }
  }

  function updateDraft(skill: BackendPendingSkill, next: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [skill.id]: { ...draftFor(skill), ...next } }))
  }

  async function runAction(skillId: string, action: () => Promise<unknown>) {
    setPendingActionId(skillId)
    setActionError(null)
    try {
      await action()
      setDrafts((current) => {
        const next = { ...current }
        delete next[skillId]
        return next
      })
      await pendingSkillsQuery.refetch()
      onChange?.()
    } catch (error) {
      setActionError(parseApiError(error).message)
    } finally {
      setPendingActionId(null)
    }
  }

  const pendingSkills = pendingSkillsQuery.data ?? []

  return (
    <Card aria-labelledby="pending-skills-title" className="flex flex-col" id="pending-skills" padding="flush">
      <div className="px-5 pb-3 pt-5">
        <CardHeader
          action={
            <Button disabled={pendingSkillsQuery.isRefreshing} onClick={() => { void pendingSkillsQuery.refetch() }} variant="secondary">
              {pendingSkillsQuery.isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          }
          helper="Only skills that are new to the app. Fix the name or category, then approve to add it to the catalog."
          id="pending-skills-title"
          title="Pending skill approvals"
        />
      </div>

      {actionError ? (
        <div className="px-5 pb-3">
          <StateBlock compact kind="error" title="That action did not complete">{actionError}</StateBlock>
        </div>
      ) : null}

      {pendingSkillsQuery.isLoading ? <div className="px-5 pb-5"><StateBlock compact kind="loading" title="Loading pending skills" /></div> : null}
      {pendingSkillsQuery.error ? (
        <div className="px-5 pb-5">
          <StateBlock
            action={<Button onClick={() => { void pendingSkillsQuery.refetch() }} variant="secondary">Retry</Button>}
            compact
            kind="error"
            title="Pending skills could not be loaded"
          />
        </div>
      ) : null}
      {pendingSkillsQuery.data && pendingSkills.length === 0 ? (
        <div className="px-5 pb-5">
          <StateBlock compact title="All caught up">No skills are awaiting approval.</StateBlock>
        </div>
      ) : null}

      {pendingSkills.length > 0 ? (
        <ul className="m-0 list-none p-0">
          {pendingSkills.map((skill) => {
            const isBusy = pendingActionId === skill.id
            const draft = draftFor(skill)
            const trimmedName = draft.name.trim()
            const details = [
              skill.enteredAs.length > 0 ? `Also typed as ${skill.enteredAs.join(', ')}` : null,
              `${skill.employeeCount} ${skill.employeeCount === 1 ? 'person' : 'people'}`,
              `Added ${dateFormatter.format(new Date(skill.createdAt))}`,
            ].filter(Boolean)

            return (
              <li className="flex flex-col gap-2 border-t border-chart-grid px-5 py-3" key={skill.id}>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="label flex min-w-0 flex-[2_1_200px] flex-col gap-1 text-text-secondary">
                    Name
                    <input
                      className={fieldInputClass}
                      disabled={isBusy}
                      maxLength={60}
                      onChange={(event) => updateDraft(skill, { name: event.target.value })}
                      value={draft.name}
                    />
                  </label>
                  <label className="label flex min-w-0 flex-[1_1_180px] flex-col gap-1 text-text-secondary">
                    Category
                    <select
                      className={fieldInputClass}
                      disabled={isBusy || categories.length === 0}
                      onChange={(event) => updateDraft(skill, { category: event.target.value })}
                      value={draft.category}
                    >
                      <option value="">Choose a category</option>
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      disabled={isBusy || !trimmedName || !draft.category}
                      onClick={() => {
                        void runAction(skill.id, () =>
                          approveSkill(skill.id, {
                            category: draft.category,
                            name: trimmedName === skill.name ? undefined : trimmedName,
                          }),
                        )
                      }}
                      variant="secondary"
                    >
                      <Check aria-hidden="true" size={16} />
                      Approve
                    </Button>
                    <Button disabled={isBusy} onClick={() => { void runAction(skill.id, () => rejectSkill(skill.id)) }} variant="ghost">
                      <X aria-hidden="true" size={16} />
                      Reject
                    </Button>
                  </div>
                </div>
                <p className="helper m-0 text-text-tertiary">
                  {details.join(' · ')}
                  {skill.employeeCount > 0 ? ' · Rejecting removes it from their profiles.' : ''}
                </p>
              </li>
            )
          })}
        </ul>
      ) : null}
    </Card>
  )
}

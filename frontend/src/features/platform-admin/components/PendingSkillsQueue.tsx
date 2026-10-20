import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { StateBlock } from '../../../components/ui/StateBlock'
import { useApiResource } from '../../../hooks/useApiResource'
import { parseApiError } from '../../../lib/api'
import { approveSkill, listPendingSkills, rejectSkill } from '../../../services/admin/adminSkillService'

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** Skills employees added that are not in the approved catalog yet. */
export function PendingSkillsQueue({ onChange }: { onChange?: () => void }) {
  const pendingSkillsQuery = useApiResource(listPendingSkills)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function runAction(skillId: string, action: (id: string) => Promise<unknown>) {
    setPendingActionId(skillId)
    setActionError(null)
    try {
      await action(skillId)
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
          helper="Approve a skill to make it count in matching and recommendations"
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
            return (
              <li className="flex flex-wrap items-center justify-between gap-3 border-t border-chart-grid px-5 py-3" key={skill.id}>
                <div className="min-w-0">
                  <p className="body-strong m-0 text-text-primary">{skill.name}</p>
                  <p className="helper m-0 text-text-tertiary">
                    {[skill.category, `Added ${dateFormatter.format(new Date(skill.createdAt))}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button disabled={isBusy} onClick={() => { void runAction(skill.id, approveSkill) }} variant="secondary">
                    <Check aria-hidden="true" size={16} />
                    Approve
                  </Button>
                  <Button disabled={isBusy} onClick={() => { void runAction(skill.id, rejectSkill) }} variant="ghost">
                    <X aria-hidden="true" size={16} />
                    Reject
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </Card>
  )
}

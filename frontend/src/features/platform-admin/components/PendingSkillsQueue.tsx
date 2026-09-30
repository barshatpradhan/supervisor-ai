import { useState } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useApiResource } from '../../../hooks/useApiResource'
import { approveSkill, listPendingSkills, rejectSkill } from '../../../services/admin/adminSkillService'

export function PendingSkillsQueue() {
  const pendingSkillsQuery = useApiResource(listPendingSkills)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)

  async function handleApprove(skillId: string) {
    setPendingActionId(skillId)
    setActionError(null)

    try {
      await approveSkill(skillId)
      await pendingSkillsQuery.refetch()
    } catch (error) {
      setActionError(error)
    } finally {
      setPendingActionId(null)
    }
  }

  async function handleReject(skillId: string) {
    setPendingActionId(skillId)
    setActionError(null)

    try {
      await rejectSkill(skillId)
      await pendingSkillsQuery.refetch()
    } catch (error) {
      setActionError(error)
    } finally {
      setPendingActionId(null)
    }
  }

  if (pendingSkillsQuery.isLoading) {
    return <LoadingState label="Loading pending skills..." />
  }

  if (pendingSkillsQuery.error || !pendingSkillsQuery.data) {
    return (
      <ErrorState
        error={pendingSkillsQuery.error}
        onRetry={() => void pendingSkillsQuery.refetch()}
        title="Unable to load pending skills"
      />
    )
  }

  const pendingSkills = pendingSkillsQuery.data

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Pending skill approvals</h2>
          <p className="mt-1 text-sm text-ink-600">
            Skills submitted by employees that need review before they count as approved.
          </p>
        </div>
        <Button onClick={() => void pendingSkillsQuery.refetch()} variant="secondary">
          {pendingSkillsQuery.isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {actionError ? (
        <div className="mt-4">
          <ErrorState error={actionError} title="Unable to complete that action" />
        </div>
      ) : null}

      {pendingSkills.length === 0 ? (
        <p className="mt-5 text-sm text-ink-600">No skills are awaiting approval.</p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {pendingSkills.map((skill) => (
            <li className="rounded-lg border border-border-subtle bg-surface-card-alt p-4" key={skill.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{skill.name}</p>
                  {skill.category ? <p className="text-xs text-ink-600">{skill.category}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={pendingActionId === skill.id}
                    onClick={() => void handleApprove(skill.id)}
                    variant="secondary"
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={pendingActionId === skill.id}
                    onClick={() => void handleReject(skill.id)}
                    variant="danger"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

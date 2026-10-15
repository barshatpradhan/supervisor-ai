import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarList } from '../../../components/charts/BarList'
import { RadialScore } from '../../../components/charts/RadialScore'
import { AiNote } from '../../../components/ui/AiNote'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useNotifications } from '../../../hooks/useNotifications'
import { queryKeys } from '../../../lib/api/queryKeys'
import { assignProjectRecommendation } from '../../../services/recommendations/recommendationService'
import { useProjectDocuments } from '../../projects/hooks/useProjectDocuments'
import { useGenerateProjectRecommendations, useProjectRecommendations } from '../../projects/hooks/useProjectRecommendations'
import type { TaskDisplay } from '../types/task'

interface SuggestedOwnersPanelProps {
  onAssigned: () => Promise<void> | void
  organizationId: string
  task: TaskDisplay
}

const aiIcon = (
  <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-pill bg-ai-bg text-ai-fg">
    <Sparkles size={16} />
  </span>
)

/**
 * The project's latest saved recommendation run, applied to this task. Scores rank people
 * for the project as a whole; assigning is always a person's click.
 */
export function SuggestedOwnersPanel({ onAssigned, organizationId, task }: SuggestedOwnersPanelProps) {
  const notifications = useNotifications()
  const queryClient = useQueryClient()
  const projectId = task.project_id
  const documentsQuery = useProjectDocuments(organizationId, projectId)
  const recommendationsQuery = useProjectRecommendations(organizationId, projectId)
  const generate = useGenerateProjectRecommendations(organizationId, projectId)
  const run = recommendationsQuery.data
  const candidates = (run?.recommendations ?? []).slice(0, 3)
  const hasAnalysis = Boolean(documentsQuery.data?.some((entry) => entry.analysis))

  const assign = useMutation({
    mutationFn: (employeeId: string) =>
      assignProjectRecommendation(projectId, {
        employeeId,
        recommendationRunId: run?.recommendationRunId as string,
        taskId: task.id,
      }),
    onError: (error) => {
      notifications.error({ message: error instanceof Error ? error.message : 'Try again in a moment.', title: 'Assignment failed' })
    },
    onSuccess: async (_result, employeeId) => {
      const name = candidates.find((candidate) => candidate.employeeId === employeeId)?.fullName ?? 'The employee'
      notifications.success({ message: `${name} now owns this task.`, title: 'Task assigned' })
      await Promise.all([
        onAssigned(),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.supervisor(organizationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.project(organizationId, projectId) }),
      ])
    },
  })

  const top = candidates[0]

  return (
    <Card aria-labelledby="suggested-owners-title" className="flex flex-col gap-4" variant="ai">
      <CardHeader helper="Ranked for this project by skill match and current workload" icon={aiIcon} id="suggested-owners-title" title="Suggested owners" />

      {recommendationsQuery.isLoading || documentsQuery.isLoading ? <StateBlock compact kind="loading" title="Loading suggestions" /> : null}

      {recommendationsQuery.error ? (
        <StateBlock action={<Button onClick={() => { void recommendationsQuery.refetch() }} variant="secondary">Retry</Button>} compact kind="error">
          Suggestions could not be loaded.
        </StateBlock>
      ) : null}

      {!recommendationsQuery.isLoading && !recommendationsQuery.error && candidates.length === 0 ? (
        hasAnalysis ? (
          <StateBlock
            action={
              <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
                {generate.isPending ? 'Generating…' : 'Generate suggestions'}
              </Button>
            }
            compact
          >
            {run ? 'The last run found no eligible employees.' : 'No suggestions have been generated for this project yet.'}
          </StateBlock>
        ) : (
          <StateBlock
            action={<Link className="label text-text-link" to={`/projects/${projectId}?tab=documents`}>Open project documents</Link>}
            compact
          >
            Analyze a requirements document for this project to get suggestions.
          </StateBlock>
        )
      ) : null}

      {generate.error ? <p className="helper m-0 text-danger-fg" role="alert">Suggestions could not be generated. Try again.</p> : null}

      {candidates.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {candidates.map((candidate) => {
            const isOwner = task.assigned_employee_id === candidate.employeeId
            return (
              <li
                className={[
                  'flex items-center gap-3.5 rounded-card border p-3',
                  isOwner ? 'border-border-primary bg-primary-50' : 'border-chart-grid bg-surface-card',
                ].join(' ')}
                key={candidate.employeeId}
              >
                <RadialScore color="chart-ai" label={`${candidate.fullName} match`} size={56} value={candidate.matchScore ?? candidate.score} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="body-strong text-text-primary">{candidate.fullName}</span>
                  <span className="helper text-text-tertiary">{candidate.reasons[0] ?? candidate.summary}</span>
                  <span className="helper text-text-secondary">
                    Workload <span className="num-xs text-text-primary">{Math.round(candidate.workloadPercentage)}%</span>
                  </span>
                </div>
                {isOwner ? (
                  <StatusBadge label="Assigned" status="completed" />
                ) : (
                  <Button
                    className="min-h-10 px-3.5"
                    disabled={assign.isPending}
                    onClick={() => assign.mutate(candidate.employeeId)}
                    // One primary action per view: only the top suggestion for an unowned task.
                    variant={!task.assigned_employee_id && candidate === candidates[0] ? 'primary' : 'secondary'}
                  >
                    {assign.isPending && assign.variables === candidate.employeeId ? 'Assigning…' : task.assigned_employee_id ? 'Reassign' : 'Assign'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      {top ? (
        <div className="flex flex-col gap-2.5 rounded-control border border-chart-grid bg-surface-inset p-4">
          <span className="label text-text-secondary">Score breakdown · {top.fullName}</span>
          <BarList
            color="chart-ai"
            data={[
              { name: 'Skill match', value: top.scoreBreakdown.skillMatch },
              { name: 'Availability', value: top.scoreBreakdown.availability },
              { name: 'Performance', value: top.scoreBreakdown.performance },
              { name: 'Workload', value: top.scoreBreakdown.workload },
            ]}
            nameWidth={96}
            unit=""
          />
        </div>
      ) : null}

      <AiNote />
    </Card>
  )
}

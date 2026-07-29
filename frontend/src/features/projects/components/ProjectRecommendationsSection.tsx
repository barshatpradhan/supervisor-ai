import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import type { BackendRecommendation } from '../../../types/backend'
import { useProjectDocuments } from '../hooks/useProjectDocuments'
import { useProjectAssignmentTasks } from '../hooks/useProjectAssignmentTasks'
import {
  useGenerateProjectRecommendations,
  useProjectRecommendations,
} from '../hooks/useProjectRecommendations'
import { RecommendationAssignmentDialog } from './RecommendationAssignmentDialog'

interface ProjectRecommendationsSectionProps {
  organizationId: string
  projectId: string
}

function formatValue(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'Not available'
}

function SkillGroup({ emptyCopy, label, skills }: { emptyCopy: string; label: string; skills: string[] }) {
  return <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card-alt p-4"><h4 className="text-sm font-semibold text-ink-900">{label}</h4>{skills.length ? <ul aria-label={label} className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <li key={`${label}-${skill}`} className="rounded-md border border-border-subtle bg-surface-card px-3 py-1.5 text-sm font-medium text-ink-700">{skill}</li>)}</ul> : <p className="mt-2 text-sm text-ink-600">{emptyCopy}</p>}</div>
}

export function ProjectRecommendationCard({ onAssign, recommendation }: { onAssign?: () => void; recommendation: BackendRecommendation }) {
  const breakdown = recommendation.scoreBreakdown
  const breakdownEntries = [
    ['Skill match', breakdown.skillMatch],
    ['Availability', breakdown.availability],
    ['Performance', breakdown.performance],
    ['Workload', breakdown.workload],
    ['Required skill match', breakdown.requiredSkillMatch],
    ['Preferred skill match', breakdown.preferredSkillMatch],
    ['Proficiency', breakdown.proficiency],
    ['Experience', breakdown.experience],
  ].filter((entry): entry is [string, number] => typeof entry[1] === 'number')

  return <article aria-label={`Rank ${recommendation.rank}: ${recommendation.fullName}`} className="space-y-5 rounded-xl border border-border-subtle bg-surface-card p-5"><header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold text-primary-700">Rank {recommendation.rank}</p><h3 className="mt-1 break-words text-xl font-bold text-ink-900">{recommendation.fullName}</h3><p className="mt-2 text-sm text-ink-600">Recommendations support staffing decisions and do not automatically assign employees.</p></div><div className="rounded-lg border border-border-subtle bg-surface-card-alt px-4 py-3"><p className="text-xs font-semibold uppercase tracking-normal text-ink-500">Recommendation score</p><p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{formatValue(recommendation.score)}</p></div></header>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Availability" value={`${formatValue(recommendation.availabilityPercentage)}%`} /><Metric label="Workload" value={`${formatValue(recommendation.workloadPercentage)}%`} /><Metric label="Performance" value={recommendation.performanceScore === null ? 'Not available' : formatValue(recommendation.performanceScore)} /><Metric label="Weekly capacity" value={`${formatValue(recommendation.weeklyCapacityHours)} hours`} /><Metric label="Estimated project hours" value={formatValue(recommendation.estimatedProjectHours)} /><Metric label="Suitability" value={recommendation.suitability} /></div>
    <section><h4 className="text-sm font-semibold text-ink-900">Recommendation reasons</h4><ul className="mt-3 grid gap-2">{recommendation.reasons.map((reason) => <li key={reason} className="text-sm leading-6 text-ink-700">{reason}</li>)}</ul></section>
    <div className="grid gap-4 lg:grid-cols-3"><SkillGroup emptyCopy="No required skill matches were returned." label="Required skills matched" skills={recommendation.matchedRequiredSkills} /><SkillGroup emptyCopy="No preferred skill matches were returned." label="Preferred skills matched" skills={recommendation.matchedPreferredSkills} /><SkillGroup emptyCopy="No missing required skills were returned." label="Missing skills" skills={recommendation.missingRequiredSkills} /></div>
    {breakdownEntries.length ? <details className="rounded-lg border border-border-subtle bg-surface-card-alt p-4"><summary className="cursor-pointer text-sm font-semibold text-ink-900">Score breakdown</summary><dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{breakdownEntries.map(([label, value]) => <Metric key={label} label={label} value={formatValue(value)} />)}</dl></details> : null}
    {onAssign ? <div className="flex justify-end border-t border-border-subtle pt-4"><Button onClick={onAssign}>Assign employee</Button></div> : null}
  </article>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card-alt p-3"><dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink-900">{value}</dd></div>
}

export function ProjectRecommendationsSection({ organizationId, projectId }: ProjectRecommendationsSectionProps) {
  const documentsQuery = useProjectDocuments(organizationId, projectId)
  const recommendationsQuery = useProjectRecommendations(organizationId, projectId)
  const generateMutation = useGenerateProjectRecommendations(organizationId, projectId)
  const tasksQuery = useProjectAssignmentTasks(organizationId, projectId, true)
  const [selectedRecommendation, setSelectedRecommendation] = useState<BackendRecommendation | null>(null)
  const hasAnalysis = Boolean(documentsQuery.data?.some((entry) => entry.analysis))
  const result = recommendationsQuery.data

  if (documentsQuery.isLoading || recommendationsQuery.isLoading) return <LoadingState label="Loading recommendations" />
  if (documentsQuery.error) return <ErrorState error={documentsQuery.error} onRetry={() => { void documentsQuery.refetch() }} title="Unable to load recommendation prerequisites" />
  if (recommendationsQuery.error) return <ErrorState error={recommendationsQuery.error} onRetry={() => { void recommendationsQuery.refetch() }} title="Unable to load saved recommendations" />
  if (!hasAnalysis) return <Card className="text-center"><h2 className="text-lg font-semibold text-ink-900">Analysis required</h2><p className="mt-2 text-sm text-ink-600">Complete AI analysis before generating employee recommendations.</p><Link className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-[var(--text-on-primary)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300" to={`/projects/${projectId}?tab=analysis`}>Open AI Analysis</Link></Card>

  const isGenerating = generateMutation.isPending
  const hasRecommendations = Boolean(result && result.recommendations.length)
  return <section aria-labelledby="project-recommendations-heading" className="space-y-6"><header className="flex flex-col gap-4 border-b border-border-subtle pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-ink-600">Advisory staffing support</p><h2 id="project-recommendations-heading" className="mt-1 text-2xl font-bold text-ink-900">Employee recommendations</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">Recommendations support staffing decisions and do not automatically assign employees.</p></div><div className="flex flex-wrap gap-3"><Button aria-label="Refresh recommendations" disabled={recommendationsQuery.isFetching || isGenerating} onClick={() => { void recommendationsQuery.refetch() }} variant="secondary">{recommendationsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</Button><Button disabled={isGenerating} onClick={() => generateMutation.mutate()}>{isGenerating ? 'Generating recommendations…' : hasRecommendations ? 'Generate new recommendations' : 'Generate recommendations'}</Button></div></header>
    {generateMutation.error ? <ErrorState error={generateMutation.error} onRetry={() => generateMutation.mutate()} title="Recommendation generation failed" /> : null}
    {!result ? <Card className="text-center"><h3 className="text-lg font-semibold text-ink-900">Recommendations have not been generated</h3><p className="mt-2 text-sm text-ink-600">Generate the first saved recommendation run for this project when you are ready to review employee fit.</p></Card> : null}
    {result && !result.recommendations.length ? <Card className="text-center"><h3 className="text-lg font-semibold text-ink-900">No eligible employees were found</h3><p className="mt-2 text-sm text-ink-600">The backend returned an empty recommendation result for this project.</p></Card> : null}
    {result && result.recommendations.length ? <><p className="text-sm text-ink-600" role="status">{result.recommendations.length} ranked employee{result.recommendations.length === 1 ? '' : 's'} in the latest saved recommendation run.</p><div className="grid gap-5">{result.recommendations.map((recommendation) => <ProjectRecommendationCard key={`${recommendation.rank}-${recommendation.employeeId}`} onAssign={recommendation.fullName ? () => setSelectedRecommendation(recommendation) : undefined} recommendation={recommendation} />)}</div></> : null}
    {selectedRecommendation && result ? <RecommendationAssignmentDialog onOpenChange={(open) => { if (!open) setSelectedRecommendation(null) }} open organizationId={organizationId} projectId={projectId} recommendation={selectedRecommendation} recommendationRunId={result.recommendationRunId} tasks={tasksQuery.data ?? []} /> : null}
  </section>
}

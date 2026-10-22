import { ChevronDown, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarList } from '../../../components/charts/BarList'
import { RadialScore } from '../../../components/charts/RadialScore'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { AiNote } from '../../../components/ui/AiNote'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Chip } from '../../../components/ui/Chip'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { Segmented } from '../../../components/ui/Segmented'
import type { BackendRecommendation } from '../../../types/backend'
import { useProjectAssignmentTasks } from '../hooks/useProjectAssignmentTasks'
import { useProjectDocuments } from '../hooks/useProjectDocuments'
import {
  useGenerateProjectRecommendations,
  useProjectRecommendations,
} from '../hooks/useProjectRecommendations'
import { RecommendationAssignmentDialog } from './RecommendationAssignmentDialog'

interface ProjectRecommendationsSectionProps {
  organizationId: string
  projectId: string
}

type Suitability = BackendRecommendation['suitability']
type FitFilter = 'all' | Suitability

const SUITABILITY: Record<Suitability, { label: string; className: string }> = {
  strong: { label: 'Strong fit', className: 'bg-success-bg text-success-text' },
  moderate: { label: 'Moderate fit', className: 'bg-warning-bg text-warning-text' },
  weak: { label: 'Weak fit', className: 'bg-surface-muted text-text-secondary' },
}

const VISIBLE_MISSING_SKILLS = 3

function formatValue(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'Not available'
}

function formatPercent(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '—'
}

function SuitabilityBadge({ suitability }: { suitability: Suitability }) {
  const { className, label } = SUITABILITY[suitability] ?? SUITABILITY.weak
  return <span className={`label rounded-pill px-2.5 py-0.5 ${className}`}>{label}</span>
}

function SkillGroup({ emptyCopy, label, skills, tone }: { emptyCopy: string; label: string; skills: string[]; tone: 'match' | 'missing' | 'neutral' }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h4 className="label m-0 text-text-secondary">{label}</h4>
      {skills.length ? (
        <ul aria-label={label} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {skills.map((skill) => (
            <li key={`${label}-${skill}`}>
              <Chip tone={tone}>{skill}</Chip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="helper m-0 text-text-tertiary">{emptyCopy}</p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="helper text-text-tertiary">{label}</dt>
      <dd className="num-sm m-0 mt-0.5 text-text-primary">{value}</dd>
    </div>
  )
}

/** The match score: a ring for the top match, a number otherwise. The exact score is always shown. */
function Score({ featured, recommendation }: { featured: boolean; recommendation: BackendRecommendation }) {
  return (
    <div className="flex items-center gap-2.5">
      {featured ? (
        <RadialScore color="chart-ai" label={`${recommendation.fullName} match score`} size={52} value={recommendation.score} />
      ) : null}
      <div className="flex flex-col items-end">
        <span className="helper whitespace-nowrap text-text-tertiary">Match score</span>
        <span className="num-sm text-text-primary">{formatValue(recommendation.score)}</span>
      </div>
    </div>
  )
}

interface ProjectRecommendationCardProps {
  recommendation: BackendRecommendation
  onAssign?: () => void
  /** The best match: highlighted, with a score ring and its details open. */
  featured?: boolean
}

/** One ranked employee: the essentials in a row, the reasoning behind "Why this match". */
export function ProjectRecommendationCard({ featured = false, onAssign, recommendation }: ProjectRecommendationCardProps) {
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

  const requiredTotal = recommendation.matchedRequiredSkills.length + recommendation.missingRequiredSkills.length
  const requiredCoverage = requiredTotal ? Math.round((recommendation.matchedRequiredSkills.length / requiredTotal) * 100) : 0
  const missing = recommendation.missingRequiredSkills
  const hiddenMissing = missing.length - VISIBLE_MISSING_SKILLS

  return (
    <article
      aria-label={`Rank ${recommendation.rank}: ${recommendation.fullName}`}
      className={[
        '@container flex flex-col gap-3 rounded-card border p-4',
        featured ? 'border-ai-border bg-ai-bg/40 shadow-raised' : 'border-border-default bg-surface-card',
      ].join(' ')}
    >
      <div className="grid gap-x-6 gap-y-3 @3xl:grid-cols-[minmax(0,1fr)_17rem_auto] @3xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="num-sm w-7 shrink-0 text-center text-text-tertiary" title={`Rank ${recommendation.rank}`}>
            #{recommendation.rank}
          </span>
          <Avatar name={recommendation.fullName} size={featured ? 48 : 40} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="body-strong m-0 text-text-primary">{recommendation.fullName}</h3>
              <SuitabilityBadge suitability={recommendation.suitability} />
              {featured ? (
                <span className="label inline-flex items-center gap-1 rounded-pill bg-ai-bg px-2.5 py-0.5 text-ai-fg">
                  <Sparkles aria-hidden="true" size={12} />
                  Top match
                </span>
              ) : null}
            </div>
            <p className="helper m-0 line-clamp-1 text-text-secondary">{recommendation.reasons[0] ?? recommendation.summary}</p>
          </div>
        </div>

        <dl className="m-0 grid grid-cols-3 gap-x-4 gap-y-1.5 @md:pl-10 @3xl:pl-0">
          <div className="col-span-3 min-w-0">
            <dt className="helper flex justify-between text-text-tertiary">
              <span>Required skills</span>
              <span className="num-xs text-text-primary">
                {recommendation.matchedRequiredSkills.length}/{requiredTotal}
              </span>
            </dt>
            <dd className="m-0 mt-1">
              <ProgressBar
                label={`${recommendation.fullName} required skill coverage`}
                showValue={false}
                size="sm"
                tone={requiredCoverage >= 75 ? 'good' : requiredCoverage >= 40 ? 'primary' : 'neutral'}
                value={requiredCoverage}
              />
            </dd>
          </div>
          <Stat label="Availability" value={formatPercent(recommendation.availabilityPercentage)} />
          <Stat label="Workload" value={formatPercent(recommendation.workloadPercentage)} />
          <Stat label="Capacity" value={`${formatValue(recommendation.weeklyCapacityHours)} h/wk`} />
        </dl>

        <div className="flex items-center justify-between gap-4 @md:pl-10 @3xl:justify-end @3xl:pl-0">
          <Score featured={featured} recommendation={recommendation} />
          {onAssign ? (
            <Button className="min-h-10 px-3.5" onClick={onAssign} variant={featured ? 'primary' : 'secondary'}>
              Assign employee
            </Button>
          ) : null}
        </div>
      </div>

      {missing.length ? (
        <div className="flex flex-wrap items-center gap-1.5 @md:pl-10">
          <span className="helper text-text-tertiary">Missing:</span>
          {missing.slice(0, VISIBLE_MISSING_SKILLS).map((skill) => (
            <Chip key={`missing-preview-${skill}`} tone="missing">{skill}</Chip>
          ))}
          {hiddenMissing > 0 ? <span className="helper text-text-tertiary">+{hiddenMissing} more</span> : null}
        </div>
      ) : null}

      <details className="group @md:pl-10" open={featured}>
        <summary className="label inline-flex cursor-pointer list-none items-center gap-1 text-text-link [&::-webkit-details-marker]:hidden">
          Why this match
          <ChevronDown aria-hidden="true" className="transition group-open:rotate-180" size={14} />
        </summary>

        <div className="mt-3 grid gap-5 rounded-control border border-chart-grid bg-surface-inset p-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="flex flex-col gap-2">
              <h4 className="label m-0 text-text-secondary">Recommendation reasons</h4>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                {recommendation.reasons.map((reason) => (
                  <li className="helper text-text-primary" key={reason}>{reason}</li>
                ))}
              </ul>
            </section>
            <SkillGroup emptyCopy="None of the required skills matched." label="Required skills matched" skills={recommendation.matchedRequiredSkills} tone="match" />
            <SkillGroup emptyCopy="No preferred skills matched." label="Preferred skills matched" skills={recommendation.matchedPreferredSkills} tone="neutral" />
            <SkillGroup emptyCopy="No required skills are missing." label="Missing skills" skills={recommendation.missingRequiredSkills} tone="missing" />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <dl className="m-0 grid grid-cols-2 gap-3">
              <Stat label="Performance" value={recommendation.performanceScore === null ? 'Not scored' : formatValue(recommendation.performanceScore)} />
              <Stat label="Project estimate" value={`${formatValue(recommendation.estimatedProjectHours)} h`} />
            </dl>
            {breakdownEntries.length ? (
              <section className="flex flex-col gap-2">
                <h4 className="label m-0 text-text-secondary">Score breakdown</h4>
                <BarList
                  color="chart-ai"
                  data={breakdownEntries.map(([name, value]) => ({ name, value }))}
                  nameWidth={140}
                  unit=""
                />
              </section>
            ) : null}
          </div>
        </div>
      </details>
    </article>
  )
}

const FIT_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'strong', label: 'Strong' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'weak', label: 'Weak' },
] as const satisfies readonly { id: FitFilter; label: string }[]

export function ProjectRecommendationsSection({ organizationId, projectId }: ProjectRecommendationsSectionProps) {
  const documentsQuery = useProjectDocuments(organizationId, projectId)
  const recommendationsQuery = useProjectRecommendations(organizationId, projectId)
  const generateMutation = useGenerateProjectRecommendations(organizationId, projectId)
  const tasksQuery = useProjectAssignmentTasks(organizationId, projectId, true)
  const [selectedRecommendation, setSelectedRecommendation] = useState<BackendRecommendation | null>(null)
  const [fit, setFit] = useState<FitFilter>('all')
  const hasAnalysis = Boolean(documentsQuery.data?.some((entry) => entry.analysis))
  const result = recommendationsQuery.data
  const recommendations = useMemo(() => result?.recommendations ?? [], [result])

  const counts = useMemo(
    () => ({
      strong: recommendations.filter((item) => item.suitability === 'strong').length,
      moderate: recommendations.filter((item) => item.suitability === 'moderate').length,
      weak: recommendations.filter((item) => item.suitability === 'weak').length,
    }),
    [recommendations],
  )
  const visible = fit === 'all' ? recommendations : recommendations.filter((item) => item.suitability === fit)
  const topEmployeeId = recommendations[0]?.employeeId

  if (documentsQuery.isLoading || recommendationsQuery.isLoading) return <LoadingState label="Loading recommendations" />
  if (documentsQuery.error) return <ErrorState error={documentsQuery.error} onRetry={() => { void documentsQuery.refetch() }} title="Unable to load recommendation prerequisites" />
  if (recommendationsQuery.error) return <ErrorState error={recommendationsQuery.error} onRetry={() => { void recommendationsQuery.refetch() }} title="Unable to load saved recommendations" />
  if (!hasAnalysis) {
    return (
      <Card className="text-center">
        <h2 className="text-lg font-semibold text-ink-900">Analysis required</h2>
        <p className="mt-2 text-sm text-ink-600">Complete AI analysis before generating employee recommendations.</p>
        <Link className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-text-on-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300" to={`/projects/${projectId}?tab=analysis`}>Open AI Analysis</Link>
      </Card>
    )
  }

  const isGenerating = generateMutation.isPending
  const hasRecommendations = recommendations.length > 0

  return (
    <section aria-labelledby="project-recommendations-heading" className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill bg-ai-bg text-ai-fg">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="m-0 text-xl font-bold text-text-primary" id="project-recommendations-heading">Employee recommendations</h2>
            <p className="helper m-0 mt-1 text-text-secondary">Ranked for this project by skill match, availability and current workload.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button aria-label="Refresh recommendations" disabled={recommendationsQuery.isFetching || isGenerating} onClick={() => { void recommendationsQuery.refetch() }} variant="secondary">
            {recommendationsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button disabled={isGenerating} onClick={() => generateMutation.mutate()}>
            {isGenerating ? 'Generating recommendations…' : hasRecommendations ? 'Generate new recommendations' : 'Generate recommendations'}
          </Button>
        </div>
      </header>

      <AiNote>Recommendations support staffing decisions and never assign anyone automatically. A person makes the final call.</AiNote>

      {generateMutation.error ? <ErrorState error={generateMutation.error} onRetry={() => generateMutation.mutate()} title="Recommendation generation failed" /> : null}

      {!result ? (
        <Card className="text-center">
          <h3 className="text-lg font-semibold text-ink-900">Recommendations have not been generated</h3>
          <p className="mt-2 text-sm text-ink-600">Generate the first saved recommendation run for this project when you are ready to review employee fit.</p>
        </Card>
      ) : null}

      {result && !hasRecommendations ? (
        <Card className="text-center">
          <h3 className="text-lg font-semibold text-ink-900">No eligible employees were found</h3>
          <p className="mt-2 text-sm text-ink-600">The backend returned an empty recommendation result for this project.</p>
        </Card>
      ) : null}

      {hasRecommendations ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="helper m-0 text-text-secondary" role="status">
              {recommendations.length} ranked employee{recommendations.length === 1 ? '' : 's'} in the latest run ·{' '}
              {counts.strong} strong · {counts.moderate} moderate · {counts.weak} weak
            </p>
            <Segmented label="Filter by fit" onChange={setFit} options={FIT_OPTIONS} value={fit} />
          </div>

          {visible.length ? (
            <ol aria-label="Ranked employees" className="m-0 flex list-none flex-col gap-3 p-0">
              {visible.map((recommendation) => (
                <li key={`${recommendation.rank}-${recommendation.employeeId}`}>
                  <ProjectRecommendationCard
                    featured={recommendation.employeeId === topEmployeeId}
                    onAssign={recommendation.fullName ? () => setSelectedRecommendation(recommendation) : undefined}
                    recommendation={recommendation}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <Card className="text-center">
              <p className="m-0 text-sm text-ink-600">No {fit} fits in this run.</p>
            </Card>
          )}
        </>
      ) : null}

      {selectedRecommendation && result ? (
        <RecommendationAssignmentDialog
          onOpenChange={(open) => { if (!open) setSelectedRecommendation(null) }}
          open
          organizationId={organizationId}
          projectId={projectId}
          recommendation={selectedRecommendation}
          recommendationRunId={result.recommendationRunId}
          tasks={tasksQuery.data ?? []}
        />
      ) : null}
    </section>
  )
}

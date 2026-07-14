import { Button } from '../../../components/ui/Button'
import type { RecommendationEmployeeCard } from '../types/recommendation'
import {
  formatRecommendationEmploymentType,
  formatRecommendationPercent,
  formatRecommendationScore,
} from '../utils/recommendationPresentation'

interface AiRecommendationResultCardProps {
  entry: RecommendationEmployeeCard
  onOpenTaskAssignment: (employeeId: string) => void
}

function MetricCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-ink-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-ink-900">{value}</p>
    </div>
  )
}

function SkillGroup({
  emptyLabel,
  items,
  label,
}: {
  emptyLabel: string
  items: string[]
  label: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <p className="text-sm font-semibold text-ink-900">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={`${label}-${item}`}
              className="rounded-full border border-border-subtle bg-surface-card px-3 py-1 text-sm font-medium text-ink-700"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-ink-600">{emptyLabel}</p>
      )}
    </div>
  )
}

export function AiRecommendationResultCard({
  entry,
  onOpenTaskAssignment,
}: AiRecommendationResultCardProps) {
  const { directoryEmployee, recommendation } = entry

  return (
    <article className="min-w-0 space-y-5 rounded-lg border border-border-subtle bg-surface-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex rounded-full border border-ai-fg/30 bg-ai-bg px-3 py-1 text-xs font-semibold text-ai-text">
            Rank #{recommendation.rank}
          </div>
          <div className="space-y-1">
            <h3 className="break-words text-xl font-bold text-ink-900">
              {recommendation.employeeName}
            </h3>
            <p className="break-words text-sm text-ink-600">
              {formatRecommendationEmploymentType(directoryEmployee?.employment_type ?? null)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Match score"
            value={formatRecommendationScore(recommendation.matchScore)}
          />
          <MetricCard
            label="Confidence"
            value={formatRecommendationScore(recommendation.confidenceScore)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Availability"
          value={formatRecommendationPercent(directoryEmployee?.availability_percentage)}
        />
        <MetricCard
          label="Workload"
          value={formatRecommendationPercent(directoryEmployee?.workload_percentage)}
        />
        <MetricCard
          label="Performance"
          value={formatRecommendationScore(directoryEmployee?.performance_score)}
        />
        <MetricCard
          label="Weekly capacity"
          value={
            directoryEmployee ? `${directoryEmployee.weekly_capacity_hours} hrs` : 'Not available'
          }
        />
      </div>

      <div className="rounded-lg border border-ai-fg/20 bg-ai-bg/50 p-4">
        <p className="text-sm font-semibold text-ai-text">Recommendation summary</p>
        <p className="mt-2 break-words text-sm leading-6 text-ink-700">{recommendation.summary}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SkillGroup
          emptyLabel="No matched skills were identified in the saved run."
          items={recommendation.matchedSkills}
          label="Matched skills"
        />
        <SkillGroup
          emptyLabel="No missing skills were identified in the saved run."
          items={recommendation.missingSkills}
          label="Missing skills"
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-card-alt p-4">
        <p className="text-sm font-semibold text-ink-900">Score breakdown</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Skill match"
            value={formatRecommendationScore(recommendation.scoreBreakdown.skillMatch)}
          />
          <MetricCard
            label="Availability"
            value={formatRecommendationScore(recommendation.scoreBreakdown.availability)}
          />
          <MetricCard
            label="Performance"
            value={formatRecommendationScore(recommendation.scoreBreakdown.performance)}
          />
          <MetricCard
            label="Workload"
            value={formatRecommendationScore(recommendation.scoreBreakdown.workload)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-ink-600">
          Assignment stays in the Tasks workspace. Review this result, then use the existing task
          assignment flow to make the final supervisor decision.
        </p>
        <Button
          className="bg-ai-fg text-white hover:bg-ai-text"
          onClick={() => {
            onOpenTaskAssignment(recommendation.employeeId)
          }}
        >
          Open task assignment
        </Button>
      </div>
    </article>
  )
}

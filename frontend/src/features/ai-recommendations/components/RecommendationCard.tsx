import { ChevronDown } from 'lucide-react'
import { RadialScore } from '../../../components/charts/RadialScore'
import { AiNote } from '../../../components/ui/AiNote'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Chip } from '../../../components/ui/Chip'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import type { BackendAssignableEmployee, BackendRecommendation } from '../../../types/backend'

const suitabilityLabels: Record<BackendRecommendation['suitability'], string> = {
  moderate: 'Moderate match',
  strong: 'Strong match',
  weak: 'Weak match',
}

interface RecommendationCardProps {
  /** Live directory metrics, when loaded; the saved run's values are used otherwise. */
  liveMetrics?: BackendAssignableEmployee | null
  onAssign?: () => void
  rec: BackendRecommendation
  showNote?: boolean
}

function Meter({ label, tone, value }: { label: string; tone: 'good' | 'bad' | 'primary'; value: number | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="label text-text-secondary">{label}</span>
      {value === null ? <span className="num-sm text-text-tertiary">Not scored</span> : <ProgressBar label={label} tone={tone} value={value} />}
    </div>
  )
}

/** The one recommendation design: who, how well they match, why, and a person's Assign. */
export function RecommendationCard({ liveMetrics, onAssign, rec, showNote = true }: RecommendationCardProps) {
  const availability = liveMetrics?.availability_percentage ?? rec.availabilityPercentage
  const workload = liveMetrics?.workload_percentage ?? rec.workloadPercentage
  const performance = liveMetrics ? liveMetrics.performance_score : rec.performanceScore
  const employment = liveMetrics ? (liveMetrics.employment_type === 'full_time' ? 'Full time' : 'Part time') : null
  const name = rec.fullName || rec.employeeName
  const reasons = rec.reasons.length > 0 ? rec.reasons : [rec.summary].filter(Boolean)

  return (
    <article aria-label={`Rank ${rec.rank}: ${name}`} className="flex flex-col gap-4 rounded-card border border-ai-border bg-surface-card p-4 shadow-card xl:p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="num-sm w-7 shrink-0 text-text-tertiary">#{rec.rank}</span>
          <Avatar name={name} size={40} variant={rec.avatarVariant} />
          <div className="min-w-0">
            <h3 className="section-title m-0 truncate text-text-primary">{name}</h3>
            <p className="helper m-0 text-text-tertiary">
              {[employment, `${rec.weeklyCapacityHours}h weekly capacity`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="label text-ai-fg">{suitabilityLabels[rec.suitability]}</span>
          <RadialScore color="chart-ai" label={`${name} match score`} size={64} value={rec.matchScore ?? rec.score} />
        </div>
      </header>

      {rec.matchedRequiredSkills.length + rec.missingRequiredSkills.length + rec.matchedPreferredSkills.length > 0 ? (
        <ul aria-label="Skills" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {rec.matchedRequiredSkills.map((skill) => <li key={`match-${skill}`}><Chip tone="match">{skill}</Chip></li>)}
          {rec.matchedPreferredSkills.map((skill) => <li key={`preferred-${skill}`}><Chip>{skill}</Chip></li>)}
          {rec.missingRequiredSkills.map((skill) => <li key={`missing-${skill}`}><Chip tone="missing">{skill}</Chip></li>)}
        </ul>
      ) : null}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <Meter label="Availability" tone="good" value={availability} />
        <Meter label="Workload" tone={workload >= 80 ? 'bad' : 'primary'} value={workload} />
        <Meter label="Performance" tone="primary" value={performance} />
      </div>

      {reasons.length > 0 ? (
        <details className="group rounded-control bg-ai-bg">
          <summary className="label flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-ai-fg [&::-webkit-details-marker]:hidden">
            Why this match
            <ChevronDown aria-hidden="true" className="transition group-open:rotate-180" size={16} />
          </summary>
          <ul className="body m-0 flex flex-col gap-1.5 px-3 pb-3 pl-8 text-text-primary">
            {reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </details>
      ) : null}

      {showNote || onAssign ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-chart-grid pt-4">
          {showNote ? <AiNote /> : <span />}
          {onAssign ? <Button onClick={onAssign} variant={rec.rank === 1 ? 'primary' : 'secondary'}>Assign</Button> : null}
        </footer>
      ) : null}
    </article>
  )
}

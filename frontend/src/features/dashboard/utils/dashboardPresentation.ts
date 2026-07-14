import type {
  DashboardEmployeeWorkloadRecord,
  DashboardRecommendationRunSummary,
  DashboardRecommendationTopCandidate,
} from '../types/dashboard'

export function formatDashboardDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDashboardPercent(value: number) {
  return `${Math.round(value)}%`
}

export function formatDashboardScore(value: number | null) {
  if (value === null) {
    return 'Not scored'
  }

  return `${Number(value).toFixed(value % 1 === 0 ? 0 : 1)} / 100`
}

export function formatEmploymentType(value: DashboardEmployeeWorkloadRecord['employment_type']) {
  return value === 'full_time' ? 'Full-time' : 'Part-time'
}

export function getWorkloadTone(value: number) {
  if (value >= 80) {
    return 'border-danger-600/20 bg-danger-50 text-danger-700'
  }

  if (value >= 60) {
    return 'border-warning-fg/30 bg-warning-bg/70 text-warning-text'
  }

  return 'border-success-fg/30 bg-success-bg/60 text-success-text'
}

export function getAvailabilityTone(value: number) {
  if (value <= 20) {
    return 'border-danger-600/20 bg-danger-50 text-danger-700'
  }

  if (value <= 40) {
    return 'border-warning-fg/30 bg-warning-bg/70 text-warning-text'
  }

  return 'border-success-fg/30 bg-success-bg/60 text-success-text'
}

export function formatRecommendationRunLabel(run: DashboardRecommendationRunSummary | null) {
  if (!run) {
    return 'No recommendation runs yet'
  }

  return `${run.project_title} · ${formatDashboardDate(run.created_at)}`
}

export function formatTopCandidateLabel(
  candidate: DashboardRecommendationTopCandidate | null,
) {
  if (!candidate) {
    return 'No top-ranked candidate yet'
  }

  return `${candidate.employee_name} · ${formatDashboardScore(candidate.match_score)}`
}

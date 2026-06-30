import type { BackendEmployeeProfile } from '../../../types/backend'
import { Card } from '../../../components/ui/Card'
import { formatEmploymentType } from '../utils/profileForm'

interface EmployeeProfileWorkInfoProps {
  profile: BackendEmployeeProfile
}

interface WorkInfoMetricProps {
  description: string
  label: string
  tone?: 'default' | 'info' | 'warning'
  value: string
}

const metricToneClasses: Record<NonNullable<WorkInfoMetricProps['tone']>, string> = {
  default: 'border-border-subtle bg-surface-card-alt',
  info: 'border-border-brand bg-info-bg/60',
  warning: 'border-warning-fg/40 bg-warning-bg/60',
}

function WorkInfoMetric({
  description,
  label,
  tone = 'default',
  value,
}: WorkInfoMetricProps) {
  return (
    <div className={`rounded-lg border p-4 ${metricToneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-normal text-ink-600">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink-600">{description}</p>
    </div>
  )
}

export function EmployeeProfileWorkInfo({
  profile,
}: EmployeeProfileWorkInfoProps) {
  return (
    <Card className="h-full">
      <div className="flex h-full flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-brand-700">
            Organization-managed
          </p>
          <h2 className="mt-2 text-xl font-bold text-ink-900">Employment information</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-600">
            Employment type, capacity, workload, and availability are managed
            automatically by your organization and task assignments.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <WorkInfoMetric
            description="Set by your organization to reflect your current contract arrangement."
            label="Employment type"
            value={formatEmploymentType(profile.employment_type)}
          />
          <WorkInfoMetric
            description="This is the total weekly work capacity currently assigned to your account."
            label="Weekly capacity"
            tone="info"
            value={`${profile.weekly_capacity_hours} hrs`}
          />
          <WorkInfoMetric
            description="Availability is recalculated automatically from active work and capacity."
            label="Availability"
            tone="info"
            value={`${profile.availability_percentage}%`}
          />
          <WorkInfoMetric
            description="Workload reflects active assigned work across your current tasks."
            label="Workload"
            tone={profile.workload_percentage >= 80 ? 'warning' : 'default'}
            value={`${profile.workload_percentage}%`}
          />
        </div>
      </div>
    </Card>
  )
}

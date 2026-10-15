import { RadialScore } from '../../../components/charts/RadialScore'
import { Card, CardHeader } from '../../../components/ui/Card'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import type { BackendEmployeeProfile } from '../../../types/backend'
import { formatEmploymentType } from '../utils/profileForm'

const HIGH_WORKLOAD_THRESHOLD = 80

/** Capacity, workload and availability. Your organization and your assignments set these. */
export function EmployeeProfileWorkInfo({ profile }: { profile: BackendEmployeeProfile }) {
  const booked = (profile.weekly_capacity_hours * profile.workload_percentage) / 100
  const isHigh = profile.workload_percentage >= HIGH_WORKLOAD_THRESHOLD

  return (
    <Card aria-labelledby="profile-workload-title" className="flex h-full flex-col gap-5">
      <CardHeader helper="Set by your organization and your current assignments" id="profile-workload-title" title="Workload this week" />
      <div className="flex flex-wrap items-center gap-6">
        <RadialScore color={isHigh ? 'danger-fg' : 'chart-1'} label="Workload" size={112} sublabel="workload" value={profile.workload_percentage} />
        <dl className="body m-0 flex min-w-44 flex-1 flex-col gap-2.5">
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">Booked</dt>
            <dd className="num-sm m-0">{Number(booked.toFixed(1))}h of {profile.weekly_capacity_hours}h</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">Employment</dt>
            <dd className="m-0 text-text-primary">{formatEmploymentType(profile.employment_type)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-text-secondary">Performance</dt>
            <dd className="num-sm m-0">{profile.performance_score === null ? 'Not scored' : Math.round(profile.performance_score)}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="label text-text-secondary">Availability</span>
        <ProgressBar label="Availability" tone="good" value={profile.availability_percentage} />
      </div>
      {isHigh ? (
        <p className="helper m-0 text-danger-fg">You are over the {HIGH_WORKLOAD_THRESHOLD}% workload limit. Talk to your supervisor before taking on more.</p>
      ) : null}
    </Card>
  )
}

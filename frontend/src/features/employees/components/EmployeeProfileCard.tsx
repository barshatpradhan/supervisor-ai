import type { BackendEmployeeProfile } from '../../../types/backend'
import { Card } from '../../../components/ui/Card'
import { formatEmploymentType } from '../utils/profileForm'

interface EmployeeProfileCardProps {
  email: string | null
  profile: BackendEmployeeProfile
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function EmployeeProfileCard({
  email,
  profile,
}: EmployeeProfileCardProps) {
  const approvedSkills = profile.skills.filter((skill) => skill.isApproved)
  const pendingSkills = profile.skills.filter((skill) => !skill.isApproved)

  return (
    <Card className="h-full">
      <div className="flex h-full flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            Employee profile
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink-900">{profile.full_name}</h2>
          <p className="mt-2 text-sm text-ink-600">
            {email ?? 'No email available'} · {formatEmploymentType(profile.employment_type)}
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-muted/60 p-4">
          <p className="text-sm font-semibold text-ink-800">Bio</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {profile.bio?.trim() || 'No bio has been added yet.'}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-ink-600">
              Approved skills
            </dt>
            <dd className="mt-2 text-2xl font-bold text-ink-900">
              {approvedSkills.length}
            </dd>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-ink-600">
              Pending skills
            </dt>
            <dd className="mt-2 text-2xl font-bold text-ink-900">
              {pendingSkills.length}
            </dd>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-ink-600">
              Joined
            </dt>
            <dd className="mt-2 text-lg font-bold text-ink-900">
              {formatDate(profile.created_at)}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}

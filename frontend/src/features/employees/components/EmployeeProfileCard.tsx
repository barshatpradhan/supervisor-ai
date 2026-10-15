import type { BackendEmployeeProfile } from '../../../types/backend'
import { Avatar } from '../../../components/ui/Avatar'
import { Card } from '../../../components/ui/Card'
import { formatEmploymentType } from '../utils/profileForm'

interface EmployeeProfileCardProps {
  email: string | null
  profile: BackendEmployeeProfile
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

/** Who you are to your organization: identity, bio and skill counts. */
export function EmployeeProfileCard({ email, profile }: EmployeeProfileCardProps) {
  const approvedSkills = profile.skills.filter((skill) => skill.isApproved).length
  const pendingSkills = profile.skills.length - approvedSkills
  const role = [profile.job_title, profile.department].filter(Boolean).join(' · ')

  return (
    <Card aria-label="Profile summary" className="flex h-full flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar name={profile.full_name} size={56} />
        <div className="min-w-0">
          <h2 className="section-title m-0 truncate text-text-primary">{profile.full_name}</h2>
          <p className="body m-0 text-text-secondary">{role || formatEmploymentType(profile.employment_type)}</p>
          {email ? <p className="helper m-0 truncate text-text-tertiary">{email}</p> : null}
        </div>
      </div>
      <p className="body m-0 text-text-primary">{profile.bio?.trim() || 'No bio yet. Add one below so your team knows your strengths.'}</p>
      <dl className="m-0 grid grid-cols-3 gap-3 rounded-control border border-chart-grid bg-surface-inset p-4">
        <div>
          <dt className="label text-text-secondary">Approved skills</dt>
          <dd className="stat-md m-0 mt-1 text-text-primary">{approvedSkills}</dd>
        </div>
        <div>
          <dt className="label text-text-secondary">Pending skills</dt>
          <dd className="stat-md m-0 mt-1 text-text-primary">{pendingSkills}</dd>
        </div>
        <div>
          <dt className="label text-text-secondary">Joined</dt>
          <dd className="num-sm m-0 mt-2 text-text-primary">{formatDate(profile.created_at)}</dd>
        </div>
      </dl>
    </Card>
  )
}

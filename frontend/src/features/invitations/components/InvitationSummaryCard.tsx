import { Building2, CalendarClock, Mail } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { Card } from '../../../components/ui/Card'
import { Chip } from '../../../components/ui/Chip'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { InvitationInspection } from '../types/invitation'
import {
  formatInvitationDate,
  getInvitationRoleLabel,
  getInvitationStatusLabel,
} from '../utils/invitationPresentation'

const statusBadges: Record<InvitationInspection['status'], string> = {
  accepted: 'completed',
  expired: 'on_hold',
  pending: 'review',
  revoked: 'blocked',
}

function daysLeft(expiresAt: string) {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
}

function Fact({ children, icon, label }: { children: ReactNode; icon: ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-muted text-text-secondary">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="label text-text-secondary">{label}</dt>
        <dd className="body m-0 break-words text-text-primary">{children}</dd>
      </div>
    </div>
  )
}

/** Who is inviting you, to what, and until when. */
export function InvitationSummaryCard({ invitation }: { invitation: InvitationInspection }) {
  const profile = invitation.profile
  const remaining = daysLeft(invitation.expires_at)
  const profileDetails = [
    ['Full name', profile.full_name],
    ['Job title', profile.job_title],
    ['Department', profile.department],
    ['Employment', profile.employment_type ? (profile.employment_type === 'full_time' ? 'Full time' : 'Part time') : null],
    ['Weekly capacity', profile.weekly_capacity_hours !== null ? `${profile.weekly_capacity_hours} hours` : null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))

  return (
    <Card aria-labelledby="invitation-summary-title" className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <Avatar name={invitation.organization.name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="label m-0 text-text-secondary">You're invited to</p>
          <h2 className="page-title m-0 break-words text-text-primary" id="invitation-summary-title">
            Join {invitation.organization.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip>{getInvitationRoleLabel(invitation.role)}</Chip>
            <StatusBadge label={getInvitationStatusLabel(invitation.status)} status={statusBadges[invitation.status]} />
          </div>
        </div>
      </div>

      <dl className="m-0 grid gap-4 sm:grid-cols-2">
        <Fact icon={<Mail size={16} />} label="Invited email">{invitation.invited_email}</Fact>
        <Fact icon={<Building2 size={16} />} label="Workspace">
          {invitation.organization.name} <span className="helper text-text-tertiary">({invitation.organization.slug})</span>
        </Fact>
        <Fact icon={<CalendarClock size={16} />} label="Expires">
          {formatInvitationDate(invitation.expires_at)}
          {invitation.status === 'pending' && remaining > 0 ? (
            <span className={['helper block', remaining <= 2 ? 'text-danger-fg' : 'text-text-tertiary'].join(' ')}>
              {remaining === 1 ? '1 day left' : `${remaining} days left`}
            </span>
          ) : null}
        </Fact>
      </dl>

      {profileDetails.length > 0 ? (
        <section aria-labelledby="invitation-profile-title" className="flex flex-col gap-3 rounded-control border border-chart-grid bg-surface-inset p-4">
          <h3 className="label m-0 text-text-secondary" id="invitation-profile-title">Your profile in this workspace</h3>
          <dl className="m-0 grid gap-3 sm:grid-cols-2">
            {profileDetails.map(([label, value]) => (
              <div key={label}>
                <dt className="helper text-text-tertiary">{label}</dt>
                <dd className="body m-0 text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="helper m-0 text-text-tertiary">You can update these from your profile after joining.</p>
        </section>
      ) : null}
    </Card>
  )
}
